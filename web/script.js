const courseList = document.getElementById("course-list");
const courseMessage = document.getElementById("course-message");
const courseForm = document.getElementById("course-form");
const formMessage = document.getElementById("form-message");
const prerequisiteSelect = document.getElementById("course-prerequisites");
const optimizeButton = document.getElementById("optimize-button");
const pathMessage = document.getElementById("path-message");
const pathResults = document.getElementById("path-results");

let courses = [];

async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
    }

    return data;
}

function showMessage(element, message, type = "") {
    element.textContent = message;
    element.className = "message";

    if (type) element.classList.add(type);
}

function updateStatistics() {
    document.getElementById("total-courses").textContent = courses.length;

    document.getElementById("completed-courses").textContent =
        courses.filter(course => course.completed).length;

    const totalHours = courses.reduce(
        (sum, course) => sum + Number(course.duration || 0), 0
    );

    document.getElementById("total-duration").textContent =
        Number(totalHours.toFixed(1));
}

function getCourseName(id) {
    const course = courses.find(item => Number(item.id) === Number(id));
    return course ? course.name : `Course ${id}`;
}

function renderCourses() {
    updateStatistics();
    courseList.replaceChildren();

    if (courses.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No courses available. Add your first course!";
        courseList.appendChild(empty);
        renderPrerequisites();
        return;
    }

    courses.forEach(course => {
        const card = document.createElement("article");
        card.className = "course-card";

        const category = document.createElement("span");
        category.className = "course-category";
        category.textContent = course.category;

        const title = document.createElement("h3");
        title.textContent = course.name;

        const duration = document.createElement("p");
        duration.textContent = `Duration: ${course.duration} hours`;

        const rating = document.createElement("p");
        rating.textContent = `Rating: ${course.rating} / 5`;

        const popularity = document.createElement("p");
        popularity.textContent = `Popularity: ${course.popularity} / 100`;

        const prerequisiteNames = (course.prerequisites || [])
            .map(getCourseName);

        const prerequisiteText = document.createElement("p");
        prerequisiteText.textContent = prerequisiteNames.length
            ? `Prerequisites: ${prerequisiteNames.join(", ")}`
            : "Prerequisites: None";

        const meta = document.createElement("div");
        meta.className = "course-meta";

        const status = document.createElement("span");
        status.textContent = course.completed ? "✓ Completed" : "In progress";

        const id = document.createElement("span");
        id.textContent = `Course #${course.id}`;

        meta.append(status, id);

        const actions = document.createElement("div");
        actions.className = "course-actions";

        const completeButton = document.createElement("button");
        completeButton.className = "complete-button";
        completeButton.textContent = course.completed
            ? "Mark Incomplete"
            : "Mark Completed";

        completeButton.addEventListener("click", () => {
            updateCompletion(course.id, !course.completed);
        });

        actions.appendChild(completeButton);
        card.append(
            category, title, duration, rating, popularity,
            prerequisiteText, meta, actions
        );

        courseList.appendChild(card);
    });

    renderPrerequisites();
}

function renderPrerequisites() {
    const previouslySelected = new Set(
        Array.from(prerequisiteSelect.selectedOptions)
            .map(option => Number(option.value))
    );

    prerequisiteSelect.replaceChildren();

    courses.forEach(course => {
        const option = document.createElement("option");
        option.value = course.id;
        option.textContent = `${course.name} (#${course.id})`;
        option.selected = previouslySelected.has(course.id);
        prerequisiteSelect.appendChild(option);
    });
}

async function loadCourses() {
    showMessage(courseMessage, "Loading courses...");

    try {
        courses = await apiRequest("/api/courses");
        renderCourses();
        showMessage(courseMessage, `${courses.length} courses loaded.`, "success");
    } catch (error) {
        showMessage(courseMessage, error.message, "error");
        courseList.replaceChildren();

        const errorBox = document.createElement("p");
        errorBox.className = "empty-state";
        errorBox.textContent =
            "Could not load courses. Check that the backend server is running.";
        courseList.appendChild(errorBox);
    }
}

async function updateCompletion(id, completed) {
    try {
        await apiRequest(`/api/courses/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed })
        });

        await loadCourses();
    } catch (error) {
        showMessage(courseMessage, error.message, "error");
    }
}

courseForm.addEventListener("submit", async event => {
    event.preventDefault();

    const name = document.getElementById("course-name").value.trim();
    const category = document.getElementById("course-category").value.trim();
    const duration = Number(document.getElementById("course-duration").value);
    const rating = Number(document.getElementById("course-rating").value);
    const popularity = Number(document.getElementById("course-popularity").value);

    const prerequisites = Array.from(prerequisiteSelect.selectedOptions)
        .map(option => Number(option.value));

    if (!name || !category || duration <= 0 ||
        rating < 0 || rating > 5 ||
        popularity < 0 || popularity > 100) {
        showMessage(formMessage, "Please enter valid course details.", "error");
        return;
    }

    try {
        await apiRequest("/api/courses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name, category, duration, rating, popularity, prerequisites
            })
        });

        courseForm.reset();
        showMessage(formMessage, "Course added successfully!", "success");
        await loadCourses();
    } catch (error) {
        showMessage(formMessage, error.message, "error");
    }
});

async function generateLearningPath() {
    optimizeButton.disabled = true;
    optimizeButton.textContent = "Optimizing...";
    pathResults.replaceChildren();
    showMessage(pathMessage, "Running the C++ optimization engine...");

    try {
        const result = await apiRequest("/api/optimize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        });

        if (result.error || result.cycleDetected) {
            throw new Error(result.error || "A prerequisite cycle was detected.");
        }

        // The C++ engine returns "learningPath", not "path".
        const learningPath = result.learningPath || result.path || [];

        const container = document.createElement("div");
        container.className = "path-result-card";

        const heading = document.createElement("h3");
        heading.textContent = "Your Recommended Learning Path";
        container.appendChild(heading);

        const summary = document.createElement("p");
        summary.textContent =
            `Courses: ${learningPath.length} | ` +
            `Total course duration: ${result.totalDuration ?? 0} hours`;

        container.appendChild(summary);

        if (result.longestPathDuration !== undefined) {
            const criticalDuration = document.createElement("p");
            criticalDuration.textContent =
                `Longest prerequisite path: ${result.longestPathDuration} hours`;
            container.appendChild(criticalDuration);
        }

        const list = document.createElement("ol");
        list.className = "path-list";

        learningPath.forEach(item => {
            const li = document.createElement("li");

            if (typeof item === "object" && item !== null) {
                const name = item.name || getCourseName(item.id);
                const course = courses.find(
                    c => Number(c.id) === Number(item.id)
                );

                const duration = item.duration ?? course?.duration;

                li.textContent = duration !== undefined
                    ? `${name} — ${duration} hours`
                    : name;
            } else {
                const course = courses.find(
                    c => Number(c.id) === Number(item)
                );

                li.textContent = course
                    ? `${course.name} — ${course.duration} hours`
                    : getCourseName(item);
            }

            list.appendChild(li);
        });

        if (learningPath.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "The optimizer returned no courses.";
            container.appendChild(empty);
        } else {
            container.appendChild(list);
        }

        // Display the critical path if available.
        if (Array.isArray(result.criticalPath) &&
            result.criticalPath.length > 0) {
            const criticalHeading = document.createElement("h4");
            criticalHeading.textContent = "Longest prerequisite sequence";
            container.appendChild(criticalHeading);

            const criticalList = document.createElement("ol");

            result.criticalPath.forEach(item => {
                const li = document.createElement("li");
                li.textContent = item.name || getCourseName(item.id);
                criticalList.appendChild(li);
            });

            container.appendChild(criticalList);
        }

        pathResults.appendChild(container);
        showMessage(
            pathMessage,
            "Learning path generated successfully!",
            "success"
        );
    } catch (error) {
        showMessage(pathMessage, error.message, "error");
    } finally {
        optimizeButton.disabled = false;
        optimizeButton.textContent = "Generate Learning Path";
    }
}

document.getElementById("refresh-courses")
    .addEventListener("click", loadCourses);

optimizeButton.addEventListener("click", generateLearningPath);

loadCourses();