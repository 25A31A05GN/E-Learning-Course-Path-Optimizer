const courseList = document.getElementById("course-list");
const courseMessage = document.getElementById("course-message");
const courseForm = document.getElementById("course-form");
const formMessage = document.getElementById("form-message");
const prerequisiteSelect = document.getElementById("course-prerequisites");
const optimizeButton = document.getElementById("optimize-button");
const pathMessage = document.getElementById("path-message");
const pathResults = document.getElementById("path-results");

let courses = [];
let nextId = 1;

function showMessage(element, message, type = "") {
    element.textContent = message;
    element.className = "message";
    if (type) element.classList.add(type);
}

function updateStatistics() {
    document.getElementById("total-courses").textContent = courses.length;
    document.getElementById("completed-courses").textContent =
        courses.filter(course => course.completed).length;
    document.getElementById("total-duration").textContent =
        courses.reduce((sum, course) => sum + Number(course.duration || 0), 0);
}

function getCourseName(id) {
    const course = courses.find(item => Number(item.id) === Number(id));
    return course ? course.name : `Course ${id}`;
}

function renderPrerequisites() {
    const selected = new Set(
        Array.from(prerequisiteSelect.selectedOptions).map(option => Number(option.value))
    );
    prerequisiteSelect.replaceChildren();

    courses.forEach(course => {
        const option = document.createElement("option");
        option.value = course.id;
        option.textContent = `${course.name} (#${course.id})`;
        option.selected = selected.has(course.id);
        prerequisiteSelect.appendChild(option);
    });
}

function renderCourses() {
    updateStatistics();
    courseList.replaceChildren();

    if (!courses.length) {
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

        const prereqs = document.createElement("p");
        const names = (course.prerequisites || []).map(getCourseName);
        prereqs.textContent = names.length
            ? `Prerequisites: ${names.join(", ")}`
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

        const button = document.createElement("button");
        button.className = "complete-button";
        button.textContent = course.completed ? "Mark Incomplete" : "Mark Completed";
        button.addEventListener("click", () => {
            course.completed = !course.completed;
            renderCourses();
        });

        actions.appendChild(button);
        card.append(category, title, duration, rating, popularity, prereqs, meta, actions);
        courseList.appendChild(card);
    });

    renderPrerequisites();
}

async function loadCourses() {
    showMessage(courseMessage, "Loading courses...");

    try {
        const response = await fetch("./data/courses.json");
        if (!response.ok) throw new Error("Could not load course data.");

        const data = await response.json();
        courses = data.courses.map(course => ({ ...course }));
        nextId = Math.max(0, ...courses.map(course => Number(course.id))) + 1;

        renderCourses();
        showMessage(courseMessage, `${courses.length} courses loaded.`, "success");
    } catch (error) {
        showMessage(courseMessage, "Could not load courses. Please refresh the page.", "error");
        courseList.replaceChildren();

        const message = document.createElement("p");
        message.className = "empty-state";
        message.textContent = error.message;
        courseList.appendChild(message);
    }
}

function generateLearningPath() {
    optimizeButton.disabled = true;
    optimizeButton.textContent = "Optimizing...";
    pathResults.replaceChildren();

    try {
        const indegree = new Map(courses.map(course => [course.id, 0]));
        const nextCourses = new Map(courses.map(course => [course.id, []]));

        for (const course of courses) {
            for (const prerequisite of course.prerequisites || []) {
                if (!indegree.has(prerequisite)) {
                    throw new Error(`Missing prerequisite course ${prerequisite}.`);
                }
                indegree.set(course.id, indegree.get(course.id) + 1);
                nextCourses.get(prerequisite).push(course.id);
            }
        }

        const queue = courses
            .filter(course => indegree.get(course.id) === 0)
            .map(course => course.id);

        const order = [];
        while (queue.length) {
            const id = queue.shift();
            order.push(id);

            for (const nextId of nextCourses.get(id)) {
                indegree.set(nextId, indegree.get(nextId) - 1);
                if (indegree.get(nextId) === 0) queue.push(nextId);
            }
        }

        if (order.length !== courses.length) {
            throw new Error("A prerequisite cycle was detected. Please review the prerequisites.");
        }

        const orderedCourses = order.map(id => courses.find(course => course.id === id));
        const longest = new Map();
        const previous = new Map();

        for (const course of orderedCourses) {
            longest.set(course.id, course.duration);
            previous.set(course.id, null);

            for (const prerequisite of course.prerequisites || []) {
                const candidate = longest.get(prerequisite) + course.duration;
                if (candidate > longest.get(course.id)) {
                    longest.set(course.id, candidate);
                    previous.set(course.id, prerequisite);
                }
            }
        }

        const totalDuration = courses.reduce((sum, course) => sum + course.duration, 0);
        let endId = null;
        let longestPathDuration = 0;

        for (const course of orderedCourses) {
            if (longest.get(course.id) > longestPathDuration) {
                longestPathDuration = longest.get(course.id);
                endId = course.id;
            }
        }

        const criticalPath = [];
        while (endId !== null) {
            criticalPath.unshift(courses.find(course => course.id === endId));
            endId = previous.get(endId);
        }

        const container = document.createElement("div");
        container.className = "path-result-card";

        const heading = document.createElement("h3");
        heading.textContent = "Your Recommended Learning Path";

        const summary = document.createElement("p");
        summary.textContent =
            `Courses: ${orderedCourses.length} | Total course duration: ${totalDuration} hours`;

        const longestText = document.createElement("p");
        longestText.textContent = `Longest prerequisite path: ${longestPathDuration} hours`;

        const list = document.createElement("ol");
        list.className = "path-list";

        orderedCourses.forEach(course => {
            const item = document.createElement("li");
            item.textContent = `${course.name} — ${course.duration} hours`;
            list.appendChild(item);
        });

        const criticalHeading = document.createElement("h4");
        criticalHeading.textContent = "Longest prerequisite sequence";

        const criticalList = document.createElement("ol");
        criticalPath.forEach(course => {
            const item = document.createElement("li");
            item.textContent = `${course.name} — ${course.duration} hours`;
            criticalList.appendChild(item);
        });

        container.append(heading, summary, longestText, list, criticalHeading, criticalList);
        pathResults.appendChild(container);
        showMessage(pathMessage, "Learning path generated successfully!", "success");
    } catch (error) {
        showMessage(pathMessage, error.message, "error");
    } finally {
        optimizeButton.disabled = false;
        optimizeButton.textContent = "Generate Learning Path";
    }
}

courseForm.addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("course-name").value.trim();
    const category = document.getElementById("course-category").value.trim();
    const duration = Number(document.getElementById("course-duration").value);
    const rating = Number(document.getElementById("course-rating").value);
    const popularity = Number(document.getElementById("course-popularity").value);
    const prerequisites = Array.from(prerequisiteSelect.selectedOptions)
        .map(option => Number(option.value));

    if (!name || !category || duration <= 0 ||
        rating < 0 || rating > 5 || popularity < 0 || popularity > 100) {
        showMessage(formMessage, "Please enter valid course details.", "error");
        return;
    }

    if (prerequisites.includes(nextId)) {
        showMessage(formMessage, "A course cannot be its own prerequisite.", "error");
        return;
    }

    courses.push({
        id: nextId++,
        name,
        category,
        duration,
        rating,
        popularity,
        prerequisites,
        completed: false
    });

    courseForm.reset();
    renderCourses();
    showMessage(formMessage, "Course added successfully for this session!", "success");
});

document.getElementById("refresh-courses").addEventListener("click", loadCourses);
optimizeButton.addEventListener("click", generateLearningPath);

loadCourses();