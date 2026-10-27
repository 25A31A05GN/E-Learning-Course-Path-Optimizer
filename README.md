# E-Learning Course Path Optimizer

## About the Project
The E-Learning Course Path Optimizer is a web-based application that helps learners organize courses according to their prerequisites and durations. It uses Data Structures and Algorithms implemented in C++ to generate a suitable learning path.

## Objectives
- Organize courses based on prerequisites.
- Generate a valid learning sequence.
- Calculate the total course duration.
- Identify the longest prerequisite path.
- Prioritize courses using course information.

## Technologies Used
- C++
- Data Structures and Algorithms
- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- JSON

## Algorithms Used
- **Topological Sorting:** Arranges courses in an order that respects prerequisites.
- **Directed Acyclic Graph (DAG):** Represents dependencies between courses.
- **Dynamic Programming:** Calculates the longest prerequisite path.
- **Priority-Based Ordering:** Helps prioritize courses using course information.

## Features
- View available courses.
- Add courses.
- Track course completion.
- Validate prerequisites.
- Generate a learning path.
- Display the longest prerequisite path and its duration.

## Sample Result
For the current sample dataset:
- Total duration of all courses: 24 hours.
- Longest prerequisite path: 18 hours.
- Number of courses in the longest path: 5.

## Project Structure
- `cpp/` – C++ algorithm implementation.
- `web/` – Frontend files.
- `data/` – Course data in JSON format.
- `server.js` – Node.js backend.
- `package.json` – Project dependencies and scripts.

## How to Run
1. Install Node.js and a C++ compiler such as GCC.
2. Open the project folder in VS Code.
3. Install dependencies using `npm install`.
4. Compile the C++ engine:
   `g++ -std=c++11 ./cpp/main.cpp ./cpp/engine.cpp -o ./cpp/engine.exe`
5. Start the server:
   `node server.js`
6. Open `http://localhost:3000` in your browser.

## Academic Purpose
This project demonstrates the practical application of Data Structures and Algorithms in an e-learning environment.