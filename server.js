const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "data", "courses.json");
const WORKSPACES_FILE = path.join(__dirname, "data", "workspaces.json");
const ENGINE_FILE = path.join(__dirname, "cpp", "engine");
const DOCS_FOLDER = path.join(__dirname, "docs");
const CPP_FOLDER = path.join(__dirname, "cpp");

app.use(express.json({ limit: "1mb" }));

// CORS configuration
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

// Serve frontend files
app.use(express.static(DOCS_FOLDER));

// JSON file helpers
function readJSON(file, fallback) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
    }

    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readCourses() {
    const data = readJSON(DATA_FILE, { courses: [] });
    return Array.isArray(data.courses) ? data.courses : [];
}

function saveCourses(courses) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify({ courses }, null, 2),
        "utf8"
    );
}

function readWorkspaces() {
    const data = readJSON(WORKSPACES_FILE, { workspaces: [] });
    return Array.isArray(data.workspaces) ? data.workspaces : [];
}

function saveWorkspaces(workspaces) {
    fs.writeFileSync(
        WORKSPACES_FILE,
        JSON.stringify({ workspaces }, null, 2),
        "utf8"
    );
}

// Workspace helpers
function validWorkspaceId(id) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function getWorkspace(id) {
    const workspaces = readWorkspaces();

    let workspace = workspaces.find(item => item.id === id);

    if (!workspace) {
        workspace = {
            id,
            selectedCourseIds: [],
            completedCourseIds: []
        };

        workspaces.push(workspace);
        saveWorkspaces(workspaces);
    }

    return workspace;
}

// Frontend
app.get("/", (req, res) => {
    res.sendFile(path.join(DOCS_FOLDER, "index.html"));
});

// Diagnostic endpoint
app.get("/api/engine-status", (req, res) => {
    const cppExists = fs.existsSync(CPP_FOLDER);
    const engineExists = fs.existsSync(ENGINE_FILE);

    let cppFiles = [];

    if (cppExists) {
        cppFiles = fs.readdirSync(CPP_FOLDER);
    }

    let engineStats = null;

    if (engineExists) {
        const stats = fs.statSync(ENGINE_FILE);

        engineStats = {
            size: stats.size,
            executable: Boolean(stats.mode & 0o111)
        };
    }

    res.json({
        projectDirectory: __dirname,
        cppFolder: CPP_FOLDER,
        cppFolderExists: cppExists,
        cppFolderFiles: cppFiles,
        enginePath: ENGINE_FILE,
        engineExists,
        engineStats
    });
});

// Get shared courses
app.get("/api/courses", (req, res) => {
    try {
        res.json({ courses: readCourses() });
    } catch (error) {
        res.status(500).json({
            error: "Could not read courses.",
            details: error.message
        });
    }
});

// Add a course
app.post("/api/courses", (req, res) => {
    try {
        const courses = readCourses();

        const {
            name,
            category,
            duration,
            rating,
            popularity,
            prerequisites
        } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            name.trim().length > 150 ||
            typeof category !== "string" ||
            !category.trim() ||
            !Number.isFinite(duration) ||
            duration <= 0 ||
            !Number.isFinite(rating) ||
            rating < 0 ||
            rating > 5 ||
            !Number.isInteger(popularity) ||
            popularity < 0 ||
            popularity > 100 ||
            !Array.isArray(prerequisites) ||
            !prerequisites.every(Number.isInteger)
        ) {
            return res.status(400).json({
                error: "Enter valid course details."
            });
        }

        const existingIds = new Set(courses.map(course => course.id));

        if (prerequisites.some(id => !existingIds.has(id))) {
            return res.status(400).json({
                error: "Invalid prerequisite selected."
            });
        }

        if (new Set(prerequisites).size !== prerequisites.length) {
            return res.status(400).json({
                error: "Duplicate prerequisites are not allowed."
            });
        }

        const id = courses.reduce(
            (max, course) => Math.max(max, course.id),
            0
        ) + 1;

        const course = {
            id,
            name: name.trim(),
            category: category.trim(),
            duration,
            rating,
            popularity,
            prerequisites
        };

        courses.push(course);
        saveCourses(courses);

        res.status(201).json(course);

    } catch (error) {
        res.status(500).json({
            error: "Could not add course.",
            details: error.message
        });
    }
});

// Get workspace
app.get("/api/workspaces/:id", (req, res) => {
    try {
        const id = req.params.id;

        if (!validWorkspaceId(id)) {
            return res.status(400).json({
                error: "Invalid workspace ID."
            });
        }

        const workspace = getWorkspace(id);

        res.json({
            selectedCourseIds: workspace.selectedCourseIds,
            completedCourseIds: workspace.completedCourseIds
        });

    } catch (error) {
        res.status(500).json({
            error: "Could not load workspace.",
            details: error.message
        });
    }
});

// Save workspace
app.put("/api/workspaces/:id", (req, res) => {
    try {
        const id = req.params.id;

        const {
            selectedCourseIds,
            completedCourseIds
        } = req.body;

        if (!validWorkspaceId(id)) {
            return res.status(400).json({
                error: "Invalid workspace ID."
            });
        }

        if (
            !Array.isArray(selectedCourseIds) ||
            !Array.isArray(completedCourseIds) ||
            !selectedCourseIds.every(Number.isInteger) ||
            !completedCourseIds.every(Number.isInteger)
        ) {
            return res.status(400).json({
                error: "Invalid learning list."
            });
        }

        const courses = readCourses();
        const validIds = new Set(courses.map(course => course.id));

        const selected = [...new Set(selectedCourseIds)];
        const completed = [...new Set(completedCourseIds)];

        if (
            selected.some(id => !validIds.has(id)) ||
            completed.some(id => !selected.includes(id))
        ) {
            return res.status(400).json({
                error: "Learning list contains invalid courses."
            });
        }

        const workspaces = readWorkspaces();

        const index = workspaces.findIndex(
            item => item.id === id
        );

        const workspace = {
            id,
            selectedCourseIds: selected,
            completedCourseIds: completed
        };

        if (index === -1) {
            workspaces.push(workspace);
        } else {
            workspaces[index] = workspace;
        }

        saveWorkspaces(workspaces);

        res.json({
            message: "Learning list saved."
        });

    } catch (error) {
        res.status(500).json({
            error: "Could not save workspace.",
            details: error.message
        });
    }
});

// Generate learning path using C++ engine
app.post("/api/optimize", (req, res) => {
    try {
        const { workspaceId } = req.body;

        if (
            typeof workspaceId !== "string" ||
            !validWorkspaceId(workspaceId)
        ) {
            return res.status(400).json({
                error: "Invalid workspace ID."
            });
        }

        const workspace = getWorkspace(workspaceId);
        const allCourses = readCourses();

        const selectedIds = new Set(
            workspace.selectedCourseIds
        );

        const courses = allCourses.filter(
            course => selectedIds.has(course.id)
        );

        if (courses.length === 0) {
            return res.status(400).json({
                error: "Add at least one course to My Learning List."
            });
        }

        // Check C++ executable
        if (!fs.existsSync(ENGINE_FILE)) {
            return res.status(500).json({
                error: "C++ engine not found.",
                expectedPath: ENGINE_FILE,
                projectDirectory: __dirname,
                cppFolderExists: fs.existsSync(CPP_FOLDER),
                cppFolderFiles: fs.existsSync(CPP_FOLDER)
                    ? fs.readdirSync(CPP_FOLDER)
                    : []
            });
        }

        // Prepare C++ input
        let input = `${courses.length}\n`;

        for (const course of courses) {
            const prerequisites = (
                course.prerequisites || []
            ).filter(id => selectedIds.has(id));

            input += `${course.id} ${course.duration} ${course.rating} `;
            input += `${course.popularity} ${prerequisites.length}\n`;

            input += `${course.name.replace(/[\r\n]/g, " ")}\n`;

            if (prerequisites.length) {
                input += prerequisites.join(" ") + "\n";
            }
        }

        // Start C++ executable
        const child = spawn(ENGINE_FILE, [], {
            windowsHide: true
        });

        let output = "";
        let errorOutput = "";
        let finished = false;

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");

        child.stdout.on("data", chunk => {
            output += chunk;
        });

        child.stderr.on("data", chunk => {
            errorOutput += chunk;
        });

        child.on("error", error => {
            if (finished) return;

            finished = true;

            res.status(500).json({
                error: "Could not start C++ engine.",
                details: error.message,
                enginePath: ENGINE_FILE
            });
        });

        child.on("close", code => {
            if (finished) return;

            finished = true;

            if (code !== 0) {
                return res.status(500).json({
                    error: "C++ engine failed.",
                    exitCode: code,
                    details: errorOutput || output
                });
            }

            try {
                const result = JSON.parse(output);

                if (result.error) {
                    return res.status(400).json(result);
                }

                const recommendations = [];

                for (const course of courses) {
                    for (const prerequisiteId of course.prerequisites || []) {
                        if (!selectedIds.has(prerequisiteId)) {
                            const prerequisite = allCourses.find(
                                item => item.id === prerequisiteId
                            );

                            if (
                                prerequisite &&
                                !recommendations.some(
                                    item => item.id === prerequisite.id
                                )
                            ) {
                                recommendations.push({
                                    id: prerequisite.id,
                                    name: prerequisite.name
                                });
                            }
                        }
                    }
                }

                result.recommendedPrerequisites = recommendations;

                res.json(result);

            } catch (error) {
                res.status(500).json({
                    error: "C++ engine returned invalid JSON.",
                    details: error.message,
                    engineOutput: output
                });
            }
        });

        child.stdin.on("error", () => {});
        child.stdin.end(input);

    } catch (error) {
        res.status(500).json({
            error: "Could not generate learning path.",
            details: error.message
        });
    }
});

// Unknown API route
app.use("/api", (req, res) => {
    res.status(404).json({
        error: "API endpoint not found."
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`E-Learning app running on port ${PORT}`);
    console.log("Project directory:", __dirname);
    console.log("C++ engine expected at:", ENGINE_FILE);
});