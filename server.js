const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, "data", "courses.json");
const ENGINE_FILE = path.join(__dirname, "cpp", "engine.exe");
const WEB_FOLDER = path.join(__dirname, "web");

app.use(express.json());
app.use(express.static(WEB_FOLDER));

function readCourses() {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return Array.isArray(data.courses) ? data.courses : [];
}

function saveCourses(courses) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify({ courses }, null, 2),
        "utf8"
    );
}

app.get("/", (req, res) => {
    res.sendFile(path.join(WEB_FOLDER, "index.html"));
});

app.get("/api/courses", (req, res) => {
    try {
        res.json(readCourses());
    } catch (error) {
        res.status(500).json({ error: "Could not read course data." });
    }
});

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
            name.length > 150 ||
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
                error: "Please provide valid course details."
            });
        }

        const existingIds = new Set(courses.map(course => course.id));

        if (prerequisites.some(id => !existingIds.has(id))) {
            return res.status(400).json({
                error: "A prerequisite course does not exist."
            });
        }

        if (new Set(prerequisites).size !== prerequisites.length) {
            return res.status(400).json({
                error: "Duplicate prerequisites are not allowed."
            });
        }

        const id = courses.reduce(
            (max, course) => Math.max(max, course.id), 0
        ) + 1;

        const course = {
            id,
            name: name.trim(),
            category: category.trim(),
            duration,
            rating,
            popularity,
            prerequisites,
            completed: false
        };

        courses.push(course);
        saveCourses(courses);

        res.status(201).json(course);
    } catch (error) {
        res.status(500).json({ error: "Could not save the course." });
    }
});

app.patch("/api/courses/:id", (req, res) => {
    try {
        const id = Number(req.params.id);
        const { completed } = req.body;

        if (!Number.isInteger(id) || typeof completed !== "boolean") {
            return res.status(400).json({
                error: "Provide a valid course ID and completion status."
            });
        }

        const courses = readCourses();
        const course = courses.find(item => item.id === id);

        if (!course) {
            return res.status(404).json({ error: "Course not found." });
        }

        if (completed) {
            const missing = (course.prerequisites || []).filter(id => {
                const prerequisite = courses.find(item => item.id === id);
                return !prerequisite || !prerequisite.completed;
            });

            if (missing.length > 0) {
                return res.status(400).json({
                    error: "Complete prerequisite courses first.",
                    missingPrerequisites: missing
                });
            }
        }

        course.completed = completed;
        saveCourses(courses);
        res.json(course);
    } catch (error) {
        res.status(500).json({
            error: "Could not update course progress."
        });
    }
});

app.post("/api/optimize", (req, res) => {
    let courses;

    try {
        courses = readCourses();
    } catch (error) {
        return res.status(500).json({
            error: "Could not read course data."
        });
    }

    if (!fs.existsSync(ENGINE_FILE)) {
        return res.status(500).json({
            error: "C++ engine not found. Compile the C++ files first."
        });
    }

    let input = `${courses.length}\n`;

    for (const course of courses) {
        const prerequisites = course.prerequisites || [];

        input += `${course.id} ${course.duration} ${course.rating} `;
        input += `${course.popularity} ${prerequisites.length}\n`;
        input += `${course.name.replace(/[\r\n]/g, " ")}\n`;

        if (prerequisites.length > 0) {
            input += prerequisites.join(" ") + "\n";
        }
    }

    const child = spawn(ENGINE_FILE, [], { windowsHide: true });

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
            error: "Could not start the C++ engine.",
            details: error.message
        });
    });

    child.on("close", code => {
        if (finished) return;
        finished = true;

        if (code !== 0) {
            return res.status(500).json({
                error: "The C++ engine failed.",
                details: errorOutput || output
            });
        }

        try {
            const result = JSON.parse(output);
            if (result.error) {
                return res.status(400).json(result);
            }
            res.json(result);
        } catch (error) {
            res.status(500).json({
                error: "The C++ engine returned invalid JSON."
            });
        }
    });

    child.stdin.on("error", () => {});
    child.stdin.end(input);
});

app.use("/api", (req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
});

app.listen(PORT, () => {
    console.log(`E-Learning app running at http://localhost:${PORT}`);
});