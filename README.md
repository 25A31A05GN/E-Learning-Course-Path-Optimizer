🎓 E-Learning Course Path Optimizer

<p align="center">
  **Plan Smarter. Learn Better. Achieve More.**
</p>An intelligent course-planning application that helps learners organize their courses and generate a structured learning path using Advanced Data Structures and Algorithms implemented in C++.

---

🌟 About the Project

Choosing what to learn and deciding the correct order can be confusing, especially when courses have prerequisites.

The E-Learning Course Path Optimizer helps solve this problem by organizing courses based on their prerequisite relationships, duration, popularity, and ratings.

It combines a user-friendly web interface with a C++ algorithm engine to generate meaningful learning paths.

✨ Key Features

- 📚 Course Catalogue – Browse the available courses.
- ➕ Add Courses – Add new courses with details such as duration, rating, popularity, and prerequisites.
- 📝 Personal Learning List – Select courses for your own learning plan.
- 🔀 Learning Path Generation – Generate an organized learning sequence.
- ⏱️ Duration Analysis – Calculate shortest and longest prerequisite paths.
- ⭐ Priority-Based Selection – Use course ratings and popularity to calculate priorities.
- ✅ Progress Tracking – Mark selected courses as completed.
- 🔗 Prerequisite Handling – Consider prerequisite relationships while generating a learning path.
- 👤 Anonymous Workspaces – Maintain an independent learning list without creating an account.

🧠 Algorithms Used

This project demonstrates important concepts from Advanced Data Structures and Algorithms:

Algorithm / Data Structure| Purpose
Directed Acyclic Graph (DAG)| Represents course prerequisites
Topological Sorting| Determines a valid learning order
Dynamic Programming| Finds shortest and longest prerequisite paths
Min-Heap / Priority Queue| Prioritizes courses using rating and popularity

🛠️ Technologies Used

Frontend

- HTML
- CSS
- JavaScript

Backend

- Node.js
- Express.js

Core Algorithm Engine

- C++

Data Storage

- JSON

📂 Project Structure

E-Learning-Course-Path-Optimizer/
│
├── cpp/
│   ├── main.cpp
│   ├── engine.cpp
│   └── engine.exe
│
├── data/
│   ├── courses.json
│   └── workspaces.json
│
├── docs/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── data/
│
├── server.js
├── package.json
├── package-lock.json
└── README.md

🚀 How to Run the Project Locally

Prerequisites

Make sure you have installed:

- Node.js
- npm
- A C++ compiler (such as GCC)
- Git (optional)

Step 1: Clone the Repository

git clone https://github.com/25A31A05GN/E-Learning-Course-Path-Optimizer.git

Step 2: Open the Project Folder

cd E-Learning-Course-Path-Optimizer

Step 3: Install Dependencies

npm install

Step 4: Compile the C++ Engine

g++ -std=c++11 cpp/main.cpp cpp/engine.cpp -o cpp/engine.exe

Step 5: Start the Server

node server.js

Step 6: Open the Application

Visit:

http://localhost:3000

🎯 Project Objective

The main objective is to demonstrate how advanced data structures and algorithms can be applied to a practical e-learning problem.

By combining graph algorithms, dynamic programming, and priority queues, the application helps learners create organized and understandable course paths.

🌍 Sustainable Development Goal

SDG 4 – Quality Education

This project supports the idea of making learning more organized and accessible by helping learners plan their educational journey.

👩‍💻 Developed By

M. I. Varshini Chowdalla

B.Tech – Computer Science and Engineering

GitHub: "25A31A05GN" (https://github.com/25A31A05GN)

---

⭐ If you find this project interesting, consider giving the repository a star!

Plan your learning journey. One course at a time!

---

🌐 Live Demo

🚀 Explore the Project:

"Open E-Learning Course Path Optimizer →" (https://25a31a05gn.github.io/E-Learning-Course-Path-Optimizer/)