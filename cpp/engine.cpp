#include <iostream>
#include <vector>
#include <queue>
#include <string>
#include <algorithm>
#include <functional>
#include <map>
#include <set>
#include <utility>

using namespace std;

struct Course {
    int id;
    string name;
    double duration;
    double rating;
    int popularity;
    vector<int> prerequisites;
};

class CourseEngine {
private:
    vector<Course> courses;
    map<int, int> indexById;

    void rebuildIndex() {
        indexById.clear();

        for (int i = 0; i < (int)courses.size(); i++) {
            indexById[courses[i].id] = i;
        }
    }

    // Escape special characters so course names
    // can be safely included in JSON output.
    string escapeJSON(const string& s) {
        string result;

        for (char ch : s) {
            switch (ch) {
                case '"':  result += "\\\""; break;
                case '\\': result += "\\\\"; break;
                case '\n': result += "\\n"; break;
                case '\r': result += "\\r"; break;
                case '\t': result += "\\t"; break;
                default:
                    if ((unsigned char)ch >= 32) {
                        result += ch;
                    }
            }
        }

        return result;
    }

public:
    bool loadInput() {
        int n;

        if (!(cin >> n) || n < 0) {
            return false;
        }

        courses.clear();

        set<int> usedIds;

        for (int i = 0; i < n; i++) {
            Course c;
            int prerequisiteCount;

            if (!(cin >> c.id
                      >> c.duration
                      >> c.rating
                      >> c.popularity
                      >> prerequisiteCount)) {
                return false;
            }

            if (usedIds.count(c.id) ||
                c.duration < 0 ||
                c.rating < 0 ||
                c.rating > 5 ||
                c.popularity < 0 ||
                prerequisiteCount < 0) {
                return false;
            }

            usedIds.insert(c.id);

            cin.ignore(10000, '\n');

            if (!getline(cin, c.name) || c.name.empty()) {
                return false;
            }

            for (int j = 0; j < prerequisiteCount; j++) {
                int prerequisiteId;

                if (!(cin >> prerequisiteId)) {
                    return false;
                }

                c.prerequisites.push_back(prerequisiteId);
            }

            courses.push_back(c);
        }

        rebuildIndex();
        return true;
    }

    bool validateGraph(vector<vector<int> >& graph,
                       vector<int>& indegree) {
        int n = (int)courses.size();

        graph.assign(n, vector<int>());
        indegree.assign(n, 0);

        for (int i = 0; i < n; i++) {
            set<int> uniquePrerequisites;

            for (int id : courses[i].prerequisites) {
                if (indexById.find(id) == indexById.end() ||
                    id == courses[i].id ||
                    !uniquePrerequisites.insert(id).second) {
                    return false;
                }

                int prerequisiteIndex = indexById[id];

                graph[prerequisiteIndex].push_back(i);
                indegree[i]++;
            }
        }

        return true;
    }

    void run() {
        vector<vector<int> > graph;
        vector<int> indegree;

        if (!validateGraph(graph, indegree)) {
            cout << "{\"error\":\"Invalid or duplicate prerequisite.\"}";
            return;
        }

        int n = (int)courses.size();

        // Topological sorting using Kahn's algorithm.
        vector<int> degree = indegree;
        vector<int> order;
        queue<int> q;

        for (int i = 0; i < n; i++) {
            if (degree[i] == 0) {
                q.push(i);
            }
        }

        while (!q.empty()) {
            int u = q.front();
            q.pop();

            order.push_back(u);

            for (int v : graph[u]) {
                degree[v]--;

                if (degree[v] == 0) {
                    q.push(v);
                }
            }
        }

        // If some courses remain, a cycle exists.
        if ((int)order.size() != n) {
            cout << "{\"error\":\"Cycle detected in prerequisites.\"}";
            return;
        }

        // Dynamic programming for the longest prerequisite path.
        vector<double> dp(n, 0.0);
        vector<int> parent(n, -1);

        for (int i = 0; i < n; i++) {
            dp[i] = courses[i].duration;
        }

        for (int u : order){
            for (int v : graph[u]) {
                double candidate = dp[u] + courses[v].duration;

                if (candidate > dp[v]) {
                    dp[v] = candidate;
                    parent[v] = u;
                }
            }
        }

        double longest = 0.0;
        int criticalEnd = -1;

        for (int i = 0; i < n; i++) {
            if (dp[i] > longest) {
                longest = dp[i];
                criticalEnd = i;
            }
        }

        vector<int> criticalPath;

        while (criticalEnd != -1) {
            criticalPath.push_back(criticalEnd);
            criticalEnd = parent[criticalEnd];
        }

        reverse(criticalPath.begin(), criticalPath.end());

        // Min-Heap: higher-rated eligible courses come first.
        priority_queue<
            pair<double, int>,
            vector<pair<double, int> >,
            greater<pair<double, int> >
        > minHeap;

        vector<int> heapDegree = indegree;

        for (int i = 0; i < n; i++) {
            if (heapDegree[i] == 0) {
                minHeap.push(make_pair(-courses[i].rating, i));
            }
        }

        vector<int> prioritized;

        while (!minHeap.empty()) {
            int u = minHeap.top().second;
            minHeap.pop();

            prioritized.push_back(u);

            for (int v : graph[u]) {
                heapDegree[v]--;

                if (heapDegree[v] == 0) {
                    minHeap.push(make_pair(-courses[v].rating, v));
                }
            }
        }

        double totalDuration = 0.0;

        for (const Course& c : courses) {
            totalDuration += c.duration;
        }

        // Return results in JSON format for the web backend.
        cout << "{\"totalDuration\":" << totalDuration
             << ",\"longestPathDuration\":" << longest
             << ",\"learningPath\":[";

        for (int i = 0; i < (int)order.size(); i++) {
            if (i > 0) cout << ",";

            const Course& c = courses[order[i]];

            cout << "{\"id\":" << c.id
                 << ",\"name\":\"" << escapeJSON(c.name) << "\"}";
        }

        cout << "],\"criticalPath\":[";

        for (int i = 0; i < (int)criticalPath.size(); i++) {
            if (i > 0) cout << ",";

            const Course& c = courses[criticalPath[i]];

            cout << "{\"id\":" << c.id
                 << ",\"name\":\"" << escapeJSON(c.name) << "\"}";
        }

        cout << "],\"priorityPath\":[";

        for (int i = 0; i < (int)prioritized.size(); i++) {
            if (i > 0) cout << ",";

            const Course& c = courses[prioritized[i]];

            cout << "{\"id\":" << c.id
                 << ",\"name\":\"" << escapeJSON(c.name) << "\"}";
        }

        cout << "]}";
    }
};

// Called by main.cpp.
int runCourseEngine() {
    CourseEngine engine;

    if (!engine.loadInput()) {
        cout << "{\"error\":\"Invalid input.\"}";
        return 1;
    }

    engine.run();
    return 0;
}