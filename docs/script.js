const API_BASE = "http://localhost:3000";

function getWorkspaceId() {
    let id = localStorage.getItem("learningWorkspaceId");

    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("learningWorkspaceId", id);
    }

    return id;
}

const workspaceId = getWorkspaceId();

let availableCourses = [];
let selectedCourseIds = [];
let completedCourseIds = [];

const availableContainer = document.getElementById("availableCourses");
const myCoursesContainer = document.getElementById("myCourses");
const pathContainer = document.getElementById("learningPath");
const messageBox = document.getElementById("message");

function showMessage(message, isError = false) {
    messageBox.textContent = message;
    messageBox.className = isError ? "error-message" : "success-message";
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(API_BASE + endpoint, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || data.message || "Request failed.");
    }

    return data;
}

async function loadData() {
    try {
        const [courseData, workspaceData] = await Promise.all([
            apiRequest("/api/courses"),
            apiRequest("/api/workspaces/" + encodeURIComponent(workspaceId))
        ]);

        availableCourses = courseData.courses || [];
        selectedCourseIds = workspaceData.selectedCourseIds || [];
        completedCourseIds = workspaceData.completedCourseIds || [];

        renderAvailableCourses();
        renderMyCourses();
        populatePrerequisites();

        showMessage("Courses loaded successfully.");
    } catch (error) {
        showMessage(error.message + " Make sure the backend is running.", true);
    }
}

function renderAvailableCourses() {
    if (!availableCourses.length) {
        availableContainer.innerHTML = "<p>No courses available yet.</p>";
        return;
    }

    availableContainer.innerHTML = availableCourses.map(course => {
        const selected = selectedCourseIds.includes(course.id);

        return `
            <article class="course-card">
                <h3>${escapeHTML(course.name)}</h3>
                <p><strong>Category:</strong> ${escapeHTML(course.category)}</p>
                <p><strong>Duration:</strong> ${course.duration} hours</p>
                <p><strong>Rating:</strong> ${course.rating}/5</p>
                <p><strong>Popularity:</strong> ${course.popularity}/100</p>
                <button class="${selected ? "secondary-btn" : "primary-btn"}"
                    onclick="toggleCourse(${course.id})"
                    ${selected ? "disabled" : ""}>
                    ${selected ? "Added to My List" : "Add to My List"}
                </button>
            </article>
        `;
    }).join("");
}

function renderMyCourses() {
    const myCourses = availableCourses.filter(course =>
        selectedCourseIds.includes(course.id)
    );

    if (!myCourses.length) {
        myCoursesContainer.innerHTML =
            "<p>You haven't added any courses to your learning list.</p>";
        return;
    }

    myCoursesContainer.innerHTML = myCourses.map(course => {
        const completed = completedCourseIds.includes(course.id);

        return `
            <article class="course-card">
                <h3>${escapeHTML(course.name)}</h3>
                <p><strong>Category:</strong> ${escapeHTML(course.category)}</p>
                <p><strong>Duration:</strong> ${course.duration} hours</p>
                <p><strong>Status:</strong> ${completed ? "Completed" : "Not completed"}</p>
                <button class="secondary-btn" onclick="toggleCompleted(${course.id})">
                    ${completed ? "Mark Not Completed" : "Mark Completed"}
                </button>
                <button class="remove-btn" onclick="removeCourse(${course.id})">
                    Remove from My List
                </button>
            </article>
        `;
    }).join("");
}

async function saveWorkspace() {
    await apiRequest("/api/workspaces/" + encodeURIComponent(workspaceId), {
        method: "PUT",
        body: JSON.stringify({
            selectedCourseIds,
            completedCourseIds
        })
    });
}

async function toggleCourse(courseId) {
    try {
        if (!selectedCourseIds.includes(courseId)) {
            selectedCourseIds.push(courseId);
        }

        await saveWorkspace();
        renderAvailableCourses();
        renderMyCourses();
        showMessage("Course added to your learning list.");
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function removeCourse(courseId) {
    try {
        selectedCourseIds = selectedCourseIds.filter(id => id !== courseId);
        completedCourseIds = completedCourseIds.filter(id => id !== courseId);

        await saveWorkspace();
        renderAvailableCourses();
        renderMyCourses();
        pathContainer.innerHTML = "<p>Generate a new path after changing your list.</p>";
        showMessage("Course removed from your personal list.");
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function toggleCompleted(courseId) {
    try {
        if (completedCourseIds.includes(courseId)) {
            completedCourseIds = completedCourseIds.filter(id => id !== courseId);
        } else {
            completedCourseIds.push(courseId);
        }

        await saveWorkspace();
        renderMyCourses();
        showMessage("Your progress has been updated.");
    } catch (error) {
        showMessage(error.message, true);
    }
}

function populatePrerequisites() {
    const select = document.getElementById("coursePrerequisites");

    select.innerHTML = availableCourses.map(course => `
        <option value="${course.id}">${escapeHTML(course.name)}</option>
    `).join("");
}

document.getElementById("showAddCourse").addEventListener("click", () => {
    document.getElementById("addCourseForm").classList.remove("hidden");
});

document.getElementById("cancelAddCourse").addEventListener("click", () => {
    document.getElementById("addCourseForm").classList.add("hidden");
});

document.getElementById("courseForm").addEventListener("submit", async event => {
    event.preventDefault();

    const prerequisites = Array.from(
        document.getElementById("coursePrerequisites").selectedOptions
    ).map(option => Number(option.value));

    const newCourse = {
        name: document.getElementById("courseName").value.trim(),
        category: document.getElementById("courseCategory").value.trim(),
        duration: Number(document.getElementById("courseDuration").value),
        rating: Number(document.getElementById("courseRating").value),
        popularity: Number(document.getElementById("coursePopularity").value),
        prerequisites
    };

    try {
        await apiRequest("/api/courses", {
            method: "POST",
            body: JSON.stringify(newCourse)
        });

        event.target.reset();
        document.getElementById("addCourseForm").classList.add("hidden");

        await loadData();
        showMessage("Course added to the common catalogue.");
    } catch (error) {
        showMessage(error.message, true);
    }
});

document.getElementById("generatePath").addEventListener("click", async () => {
    if (!selectedCourseIds.length) {
        showMessage("Please add at least one course to My Learning List.", true);
        return;
    }

    try {
        pathContainer.innerHTML = "<p>Generating your learning path...</p>";

        const result = await apiRequest("/api/optimize", {
            method: "POST",
            body: JSON.stringify({ workspaceId })
        });

        displayLearningPath(result);
        showMessage("Your learning path has been generated.");
    } catch (error) {
        pathContainer.innerHTML = "";
        showMessage(error.message, true);
    }
});

function displayLearningPath(result) {
    const path = result.learningPath || [];

    if (!path.length) {
        pathContainer.innerHTML = "<p>No learning path was returned.</p>";
        return;
    }

    const pathHTML = path.map((course, index) => `
        <div class="path-item">
            <span class="path-number">${index + 1}</span>
            <div>
                <strong>${escapeHTML(course.name)}</strong>
            </div>
        </div>
    `).join("");

    let recommendationHTML = "";

    if (result.recommendedPrerequisites?.length) {
        recommendationHTML = `
            <div class="recommendations">
                <h3>Optional prerequisite recommendations</h3>
                <p>These courses may help you understand your selected courses better. You do not have to add them.</p>
                <ul>
                    ${result.recommendedPrerequisites.map(course =>
                        `<li>${escapeHTML(course.name)}</li>`
                    ).join("")}
                </ul>
            </div>
        `;
    }

    pathContainer.innerHTML = `
        <h3>Your Recommended Learning Order</h3>
        ${pathHTML}
        <p><strong>Total Duration:</strong> ${result.totalDuration} hours</p>
        <p><strong>Longest Prerequisite Path:</strong> ${result.longestPathDuration} hours</p>
        ${recommendationHTML}
    `;
}

loadData();