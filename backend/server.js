import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import pdfParse from "pdf-parse";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-development-secret";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");
if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, "[]");

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return []; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function normalize(s = "") {
  return s.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ").trim();
}
function tokens(s = "") {
  return new Set(normalize(s).split(" ").filter(x => x.length > 2));
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = /pdf|msword|officedocument/.test(file.mimetype);
    cb(ok ? null : new Error("Only PDF/DOC/DOCX files are supported."), ok);
  }
});

const roles = [
  { name: "Full Stack Developer", skills: ["javascript","react","node","express","mongodb","sql","html","css"] },
  { name: "Python Developer", skills: ["python","flask","django","sql","api","oop"] },
  { name: "AI/ML Engineer", skills: ["python","machine learning","deep learning","nlp","opencv","pytorch","tensorflow","ai"] },
  { name: "Java Developer", skills: ["java","spring","sql","oops","hibernate"] },
  { name: "Data Analyst", skills: ["python","sql","pandas","numpy","excel","visualization"] }
];

const questions = {
  "Java": [
    "What is Java and what are its main features?","What is the difference between JDK, JRE and JVM?","What are primitive data types in Java?","What is type casting?","What is the difference between == and equals()?","Why are Strings immutable in Java?","What is StringBuilder?","What is an array?","What is an exception?","Checked vs unchecked exceptions?","What is try-catch-finally?","What is throw vs throws?","What is the Java Collections Framework?","ArrayList vs LinkedList?","HashSet vs TreeSet?","HashMap vs Hashtable?","What is an iterator?","What are generics?","What is a thread?","What is multithreading?","What is synchronization?","What is a lambda expression?","What is a functional interface?","What is a stream?","What is garbage collection?","What is a package?","What are access modifiers?","What is static?","What is final?","What is an enum?","What is an interface?","What is an abstract class?","What is a constructor?","Can a constructor be overloaded?","What is method overloading?","What is method overriding?","What is inheritance?","What is polymorphism?","What is encapsulation?","What is abstraction?","What is the difference between composition and inheritance?","What is pass-by-value in Java?","What is an immutable object?","What is a record?","What is Optional?","What is ConcurrentHashMap?","What is deadlock?","What is a race condition?","How does JVM memory work?","How would you optimize a slow Java program?"
  ],
  "OOP": [
    "What is OOP?","What is a class?","What is an object?","What is a constructor?","What is encapsulation?","What is abstraction?","What is inheritance?","What is polymorphism?","What is compile-time polymorphism?","What is runtime polymorphism?","What is method overloading?","What is method overriding?","What is an interface?","What is an abstract class?","Interface vs abstract class?","What is multiple inheritance?","What is association?","What is aggregation?","What is composition?","Aggregation vs composition?","What is coupling?","What is cohesion?","What is dependency injection?","What is the SOLID principle?","Explain Single Responsibility Principle.","Explain Open/Closed Principle.","Explain Liskov Substitution Principle.","Explain Interface Segregation Principle.","Explain Dependency Inversion Principle.","What is dynamic binding?","What is static binding?","What is data hiding?","What is message passing?","What is object state?","What is object behavior?","Why is OOP useful?","Give a real-world example of encapsulation.","Give a real-world example of inheritance.","Give a real-world example of polymorphism.","How does abstraction reduce complexity?","Composition vs inheritance: when would you choose each?","What is an immutable object?","What is an IS-A relationship?","What is a HAS-A relationship?","What is the diamond problem?","How do interfaces support abstraction?","How can OOP improve maintainability?","How can OOP improve reuse?","What are common OOP design mistakes?","Design a simple library system using OOP."
  ],
  "Python": [
    "What is Python?","What are Python's main features?","List vs tuple?","Set vs list?","Dictionary vs list?","What is mutability?","What is slicing?","What is list comprehension?","What is a lambda function?","What are *args and **kwargs?","What is a function?","Local vs global scope?","What is LEGB?","What is exception handling?","What is try-except-finally?","What is a module?","What is a package?","What is a virtual environment?","What is pip?","What is an iterator?","What is a generator?","What does yield do?","What is a decorator?","What is a context manager?","What is the with statement?","What is shallow copy vs deep copy?","What is garbage collection?","How is memory managed in Python?","What is duck typing?","What is dynamic typing?","What is __init__?","What is self?","What is inheritance in Python?","What is method overriding?","What are class and instance variables?","What is @staticmethod?","What is @classmethod?","What is an abstract base class?","What is JSON handling in Python?","How do you read a file?","How do you handle CSV data?","What is a virtual environment used for?","What is the GIL?","Threading vs multiprocessing?","What is async programming?","What is a REST API client?","How do you debug Python code?","How do you improve Python performance?","What are common Python security mistakes?","How would you structure a production Python project?"
  ],
  "MERN Stack": [
    "What is the MERN stack?","What is MongoDB?","What is Express.js?","What is React?","What is Node.js?","Why use MongoDB with Node?","What is a document in MongoDB?","What is a collection?","What is CRUD?","What is Mongoose?","What is middleware in Express?","What is routing?","What is REST?","What are HTTP methods?","What are HTTP status codes?","What is JSON?","What is CORS?","What is authentication?","What is authorization?","What is JWT?","Where should JWTs be stored?","What is password hashing?","What is bcrypt?","What is React component?","Props vs state?","What is a React hook?","What is useState?","What is useEffect?","What is conditional rendering?","What is React Router?","What is controlled input?","What is lifting state up?","What is Context API?","What is async/await?","What is a Promise?","How do you handle API errors?","What is an API interceptor?","How do you validate input?","How do you prevent SQL/NoSQL injection?","How do you secure Express APIs?","How do you structure a MERN project?","How do you connect React to Express?","How do you deploy a MERN app?","What is environment configuration?","What is rate limiting?","What is pagination?","What is indexing in MongoDB?","What is aggregation in MongoDB?","How do you optimize a slow React app?","How would you design a scalable MERN application?"
  ],
  "DBMS": [
    "What is DBMS?","DBMS vs RDBMS?","What is a table?","What is a primary key?","What is a foreign key?","What is a candidate key?","What is a super key?","What is a composite key?","What is normalization?","What is 1NF?","What is 2NF?","What is 3NF?","What is BCNF?","What is denormalization?","What is SQL?","DDL vs DML vs DCL vs TCL?","What is a JOIN?","INNER JOIN vs LEFT JOIN?","What is a self join?","What is a subquery?","What is a view?","What is an index?","Clustered vs non-clustered index?","What is a transaction?","What are ACID properties?","What is concurrency control?","What is a lock?","What is deadlock?","What is a stored procedure?","What is a trigger?","What are constraints?","What is NULL?","WHERE vs HAVING?","GROUP BY vs ORDER BY?","What is DISTINCT?","What is a window function?","What is a CTE?","What is a database schema?","What is referential integrity?","What is SQL injection?","How do prepared statements help security?","What is a query execution plan?","How do indexes improve performance?","When can indexes hurt performance?","What is database backup?","What is replication?","What is sharding?","What is CAP theorem?","How do you optimize a slow query?","Design tables for an online interview platform."
  ],
  "Operating Systems": [
    "What is an operating system?","What are the main functions of an OS?","What is a process?","What is a thread?","Process vs thread?","What is a process control block?","What is context switching?","What is CPU scheduling?","What is FCFS?","What is SJF?","What is Round Robin?","What is priority scheduling?","What is starvation?","What is aging?","What is deadlock?","What are the four deadlock conditions?","Deadlock prevention vs avoidance?","What is Banker’s algorithm?","What is a race condition?","What is synchronization?","What is a mutex?","What is a semaphore?","Mutex vs semaphore?","What is a critical section?","What is virtual memory?","What is paging?","What is segmentation?","Paging vs segmentation?","What is a page fault?","What is page replacement?","FIFO vs LRU?","What is thrashing?","What is fragmentation?","Internal vs external fragmentation?","What is memory allocation?","What is swapping?","What is a system call?","User mode vs kernel mode?","What is a kernel?","What is a file system?","What is a file descriptor?","What is an interrupt?","What is DMA?","What is IPC?","What is a pipe?","What is shared memory?","What is a scheduler?","What is multiprogramming?","What is multitasking?","How would you diagnose a system with high CPU and memory usage?"
  ]
};


const webQuestions = {
  "MongoDB": [
    "What is MongoDB and why is it called a document database?","What is a MongoDB document?","What is a collection in MongoDB?","MongoDB document vs SQL row?","What is BSON?","What is the _id field?","How does ObjectId work?","How do you insert one document?","How do you insert many documents?","How do you find documents?","How do you update a document?","How do you delete a document?","What is CRUD in MongoDB?","What is a MongoDB query filter?","What is projection?","What is sorting?","What is limit and skip?","What is an index?","Why do indexes improve reads?","When can indexes hurt performance?","What is a compound index?","What is a unique index?","What is a text index?","What is the aggregation framework?","What is an aggregation pipeline?","What is $match?","What is $group?","What is $lookup?","What is $project?","What is $unwind?","What is embedding in MongoDB?","What is referencing in MongoDB?","Embedding vs referencing?","How do you model one-to-many data?","How do you model many-to-many data?","What is schema validation?","What is Mongoose?","What is a Mongoose schema?","What is a Mongoose model?","What are Mongoose validators?","What are MongoDB transactions?","What is replication?","What is a replica set?","What is sharding?","What is a shard key?","What is read preference?","What is write concern?","How do you secure MongoDB?","How do you optimize a slow MongoDB query?","How would you design MongoDB collections for an interview platform?"
  ],
  "React": [
    "What is React?","Why is React called a library?","What is a React component?","Functional vs class components?","What are props?","What is state?","Props vs state?","What is JSX?","Why does JSX need a compiler?","What is the virtual DOM?","How does reconciliation work?","What is rendering?","What is useState?","What is useEffect?","What is useRef?","What is useMemo?","What is useCallback?","What is useContext?","What are React hooks?","What are the Rules of Hooks?","What is conditional rendering?","What is list rendering?","Why are keys required in lists?","What is a controlled component?","What is an uncontrolled component?","What is lifting state up?","What is prop drilling?","How does Context API help?","What is React Router?","How do route parameters work?","How do you handle forms in React?","How do you validate a React form?","How do you call an API from React?","How do you handle loading and error states?","What is a custom hook?","How do you share logic between components?","What causes unnecessary re-renders?","How do you optimize React performance?","What is code splitting?","What is lazy loading?","What is React.memo?","What is an error boundary?","What is StrictMode?","What is hydration?","What is server-side rendering?","What is client-side rendering?","How do you protect routes?","How do you manage authentication state?","How do you structure a scalable React project?","How would you debug a slow React page?"
  ],
  "Node.js": [
    "What is Node.js?","Why is Node.js useful for backend development?","Is Node.js a programming language?","What is the V8 engine?","What is the event loop?","What is non-blocking I/O?","What is asynchronous programming?","Callback vs Promise?","What is async/await?","What is npm?","What is package.json?","What is package-lock.json?","What is a Node module?","CommonJS vs ES modules?","What is require?","What is import?","What is process in Node.js?","What is process.env?","What is a Buffer?","What is a stream?","What are readable and writable streams?","What is EventEmitter?","What is middleware concept in Node?","How do you create an HTTP server?","How do you handle HTTP requests?","How do you handle errors in Node.js?","How do you read files asynchronously?","How do you work with JSON files?","What is a REST API in Node.js?","How do you connect Node.js to MongoDB?","How do you connect Node.js to MySQL?","What is connection pooling?","What is CORS?","What is authentication?","What is JWT authentication in Node?","How do you hash passwords?","How do you validate API input?","How do you prevent NoSQL injection?","How do you prevent command injection?","What is rate limiting?","How do you log Node.js applications?","How do you manage environment variables?","What is clustering?","Worker threads vs child processes?","How do you scale a Node.js application?","How do you test a Node.js API?","How do you structure a production Node.js project?","How do you handle uncaught exceptions?","How would you diagnose high CPU usage in Node.js?","How would you design a scalable Node.js API?"
  ],
  "Express.js": [
    "What is Express.js?","Why is Express used with Node.js?","How do you create an Express server?","What is Express routing?","What is middleware?","Application-level vs router-level middleware?","What is req in Express?","What is res in Express?","What is next in Express?","How do you create a GET route?","How do you create a POST route?","How do you read route parameters?","How do you read query parameters?","How do you read JSON request bodies?","What is express.json()?","How do you serve static files?","How do you organize Express routes?","What is an Express Router?","How do you create custom middleware?","How do you handle errors in Express?","What is error-handling middleware?","How do you validate requests?","How do you return HTTP status codes?","How do you send JSON responses?","What is CORS in Express?","How do you configure CORS securely?","How do you implement authentication middleware?","How do you implement JWT authorization?","How do you protect an Express route?","How do you hash passwords?","How do you prevent SQL injection?","How do you prevent NoSQL injection?","How do you prevent XSS?","How do you prevent CSRF?","What security headers should an Express app use?","What is Helmet?","What is rate limiting?","How do you upload files in Express?","What is multer?","How do you connect Express to MongoDB?","How do you structure controllers and services?","What is MVC in Express applications?","How do you handle async errors?","How do you log API requests?","How do you test Express APIs?","How do you version an API?","How do you document an Express API?","How do you deploy an Express application?","How would you design a production Express API?","How do you version an Express API without breaking old clients?"
  ],
  "HTML": [
    "What is HTML?","What is the purpose of HTML?","What is an HTML element?","What is an HTML attribute?","What is the difference between tag and element?","What is semantic HTML?","Why use semantic elements?","What is the difference between div and span?","What is a heading element?","What is a paragraph element?","What is an anchor tag?","What is the href attribute?","What is an image element?","What is alt text?","What is a form?","What are input types?","What is label and why is it important?","What is the name attribute in forms?","GET vs POST forms?","What is HTML validation?","What is required?","What is placeholder?","What is a button element?","Button vs input submit?","What is a table?","What are thead, tbody and tfoot?","What is a list?","Ordered vs unordered list?","What are HTML5 semantic tags?","What is header?","What is nav?","What is main?","What is section?","What is article?","What is footer?","What is iframe?","What is the meta viewport tag?","What is the DOCTYPE declaration?","What is accessibility in HTML?","What is ARIA?","Why should alt text be used?","What is the difference between id and class?","Can an id be repeated?","What is data-* attribute?","What is the script tag?","Where should JavaScript be loaded?","What is defer?","What is async?","How do you improve HTML SEO?","How do you make a form accessible?"
  ],
  "CSS": [
    "What is CSS?","Why is CSS used?","What are the three ways to apply CSS?","What is a selector?","What is specificity?","What is the cascade?","What is inheritance in CSS?","What is the box model?","What are margin and padding?","What is border?","What is box-sizing?","What is display property?","Block vs inline elements?","What is inline-block?","What is flexbox?","What is a flex container?","What is justify-content?","What is align-items?","What is flex-direction?","What is flex-wrap?","What is CSS Grid?","Grid vs Flexbox?","What are grid rows and columns?","What is position relative?","What is position absolute?","What is fixed positioning?","What is sticky positioning?","What is z-index?","What is overflow?","What are pseudo-classes?","What are pseudo-elements?","What is :hover?","What is ::before?","What are media queries?","How do you build responsive layouts?","What are CSS units?","px vs em vs rem?","What are viewport units?","What are CSS variables?","How do you use calc()?","What is a transition?","What is an animation?","What are keyframes?","How do you center an element?","How do you create a responsive navbar?","How do you avoid CSS conflicts?","What is BEM?","How do you optimize CSS performance?","How do you debug CSS layout problems?","How would you structure CSS for a large project?"
  ],
  "JavaScript": [
    "What is JavaScript?","What are JavaScript data types?","var vs let vs const?","What is scope?","What is lexical scope?","What is hoisting?","What is the temporal dead zone?","What is a closure?","What is a callback?","What is a Promise?","What is async/await?","What is the event loop?","What is the call stack?","What is the task queue?","Microtasks vs macrotasks?","What is the DOM?","How do you select an element?","What is event handling?","What is event bubbling?","What is event capturing?","What is event delegation?","What is preventDefault()?","What is stopPropagation()?","== vs ===?","null vs undefined?","What is NaN?","What is truthy and falsy?","What is type coercion?","What is destructuring?","What are spread and rest operators?","What are template literals?","What are arrow functions?","Arrow function vs regular function?","What is this?","How does this work in arrow functions?","What is prototype inheritance?","What is a class in JavaScript?","What are modules?","CommonJS vs ES modules?","What is JSON?","What is localStorage?","What is sessionStorage?","Cookies vs localStorage?","What is fetch()?","How do you handle fetch errors?","What is optional chaining?","What is nullish coalescing?","What is debounce?","What is throttle?","How do you improve JavaScript performance?"
  ]
};

const conceptRules = [
  { match: ["jdk","jre","jvm"], concepts: ["JDK","JRE","JVM"] },
  { match: ["==","equals"], concepts: ["reference/value comparison","equals method"] },
  { match: ["immutable","cannot change","new object"], concepts: ["immutable","String"] },
  { match: ["arraylist","linkedlist"], concepts: ["ArrayList","LinkedList","access/insertion"] },
  { match: ["encapsulation"], concepts: ["data hiding","private","getter","setter"] },
  { match: ["abstraction"], concepts: ["hide implementation","essential details","abstract","interface"] },
  { match: ["inheritance"], concepts: ["parent","child","extends","reuse"] },
  { match: ["polymorphism"], concepts: ["overloading","overriding","same interface"] },
  { match: ["authentication","authorization"], concepts: ["identity/login","permission/access"] },
  { match: ["rest"], concepts: ["HTTP","resource","stateless","GET","POST","PUT","DELETE"] },
  { match: ["primary key"], concepts: ["unique","identify","not null"] },
  { match: ["foreign key"], concepts: ["relationship","references","another table"] },
  { match: ["normalization"], concepts: ["redundancy","dependency","normal forms"] },
  { match: ["acid"], concepts: ["atomicity","consistency","isolation","durability"] },
  { match: ["process vs thread","process and thread"], concepts: ["process","thread","memory","lightweight"] },
  { match: ["deadlock"], concepts: ["mutual exclusion","hold and wait","no preemption","circular wait"] },
  { match: ["virtual memory"], concepts: ["RAM","disk","pages","address space"] },
  { match: ["react hook","usestate"], concepts: ["state","component","hook"] },
  { match: ["useeffect"], concepts: ["side effect","render","dependency"] },
  { match: ["jwt"], concepts: ["token","authentication","signature","expiry"] },
  { match: ["bcrypt"], concepts: ["hash","password","salt"] },
  { match: ["mongodb"], concepts: ["document","collection","NoSQL"] },
  { match: ["python"], concepts: ["interpreted","dynamic","indentation"] }
];

function roleMatch(text) {
  const t = normalize(text);
  return roles.map(r => {
    const matched = r.skills.filter(k => t.includes(k));
    const raw = Math.round((matched.length / r.skills.length) * 100);
    return {
      name: r.name,
      matched,
      missing: r.skills.filter(k => !t.includes(k)),
      percentage: Math.min(98, Math.max(0, raw))
    };
  }).sort((a,b)=>b.percentage-a.percentage).slice(0,3);
}

function extractSkills(text) {
  const dictionary = [
    "Java","Python","JavaScript","React","Node.js","Express","MongoDB",
    "MySQL","SQL","Flask","HTML","CSS","YOLO","OpenCV","Machine Learning",
    "Deep Learning","NLP","TensorFlow","PyTorch","DSA","OOP","DBMS",
    "Operating Systems","Computer Networks","Git","REST API","MERN"
  ];
  const t = normalize(text);
  return dictionary.filter(x => t.includes(normalize(x)));
}

function detectProjects(text) {
  const found = [];
  const lower = text.toLowerCase();
  const projectPatterns = [
    ["SafeEye", ["safeeye","crowd monitoring","crowd management","yolov8","yolo"]],
    ["Aqua Scan", ["aqua scan","water quality","pollution monitoring","underwater"]],
    ["Expense Tracker", ["expense tracker"]],
    ["Fake News Detection", ["fake news","tf-idf","logistic regression"]],
    ["RFID Attendance", ["rfid","attendance"]]
  ];
  for (const [name, keys] of projectPatterns) {
    if (keys.some(k => lower.includes(k))) found.push(name);
  }
  return found;
}

function buildCriteria(question, kind="Technical") {
  const q = normalize(question);
  for (const rule of conceptRules) {
    if (rule.match.some(m => q.includes(normalize(m)))) {
      return rule.concepts;
    }
  }
  if (kind === "HR") return ["direct answer", "specific example", "clear reasoning"];
  const stop = new Set(["what","is","are","the","and","how","why","your","you","would","can","explain","tell","about","difference","between","in","a","an","to","of"]);
  const qwords = [...tokens(question)].filter(x => !stop.has(x));
  return qwords.slice(0,6);
}

function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTechnicalInterview(resumeText, difficulty) {
  const skills = extractSkills(resumeText);
  const projects = detectProjects(resumeText);
  const result = [];

  // Strongly prioritize questions about actual resume projects.
  if (projects.includes("SafeEye")) {
    result.push(
      { question: "You listed SafeEye, your AI-powered smart crowd monitoring system. Explain the problem it solves, the complete workflow, the technologies used, and your personal contribution.", criteria: ["SafeEye", "crowd monitoring", "YOLO", "OpenCV", "Flask", "alert/security", "personal contribution"] },
      { question: "In SafeEye, why did you use YOLO and OpenCV together? Explain what YOLO does, what OpenCV does with each frame, and how people are counted.", criteria: ["YOLO", "person/object detection", "OpenCV", "frame processing", "bounding boxes/count"] },
      { question: "How does SafeEye decide when a crowd becomes dangerous and when security should be alerted? Explain the threshold, zone logic, and alert flow.", criteria: ["crowd threshold", "zone", "count", "alert", "security"] },
      { question: "Your SafeEye prototype uses a mobile IP camera. Explain the data flow from the camera to Flask and the AI model, and what you would change for CCTV/RTSP deployment.", criteria: ["IP camera", "Flask", "video/frame", "YOLO", "RTSP/CCTV"] },
      { question: "What are the main performance limitations of SafeEye and how would you improve FPS, latency, reliability, and multi-camera scalability?", criteria: ["FPS", "latency", "optimization", "multi-camera", "scalability"] }
    );
  }
  if (projects.includes("Aqua Scan")) {
    result.push(
      { question: "You listed Aqua Scan. Explain the problem, the underwater/edge AI architecture, the sensors, and how the system detects or reports pollution.", criteria: ["Aqua Scan", "water pollution", "sensors", "edge AI/Jetson", "detection/reporting"] },
      { question: "Why is edge AI useful for Aqua Scan compared with sending every underwater video frame to a cloud server? Discuss latency, bandwidth, and reliability.", criteria: ["edge AI", "latency", "bandwidth", "cloud", "reliability"] }
    );
  }
  if (projects.includes("Expense Tracker")) {
    result.push(
      { question: "Explain your Expense Tracker architecture. How did the frontend, Node/Express backend, database, API, and transaction flow work together?", criteria: ["Expense Tracker", "Node", "Express", "MongoDB", "API", "CRUD", "transaction"] },
      { question: "If you added SMS-style transaction notifications to your Expense Tracker, how would you design the event flow and prevent duplicate notifications?", criteria: ["transaction event", "notification", "API/service", "duplicate prevention", "database"] }
    );
  }
  if (projects.includes("Fake News Detection")) {
    result.push({ question: "Explain your Fake News Detection project from text preprocessing through TF-IDF, model training, prediction, and evaluation. Why did you choose Logistic Regression?", criteria: ["Fake News", "preprocessing", "TF-IDF", "Logistic Regression", "evaluation"] });
  }
  if (projects.includes("RFID Attendance")) {
    result.push({ question: "Explain how your RFID Attendance system identifies a student, records attendance, and prevents duplicate or invalid attendance entries.", criteria: ["RFID", "student identification", "attendance", "database", "duplicate/validation"] });
  }

  // Ask about technologies actually present in the resume, not random technologies.
  for (const skill of [...new Set(skills)]) {
    if (result.length >= 9) break;
    result.push({
      question: `Your resume mentions ${skill}. Explain exactly how you used ${skill} in your project or internship, what you personally implemented, and one problem you solved using it.`,
      criteria: [skill, "actual usage", "personal implementation", "problem solved", "result"]
    });
  }

  const generic = [
    { q:"Explain one REST API you built or used. Describe the endpoint, HTTP method, request, response, status code, validation, and error handling.", c:["REST API","HTTP method","request/response","status code","validation","error handling"] },
    { q:"Explain how you used a database in one of your projects. Describe the schema or collections, CRUD operations, relationships, and why you chose that database.", c:["database","schema/collection","CRUD","relationship","reason"] },
    { q:"Explain one difficult technical bug from your project. How did you reproduce it, diagnose the root cause, fix it, and verify the fix?", c:["bug","reproduce","diagnose","root cause","fix","verify"] },
    { q:"Explain OOP and connect at least two OOP principles to code you have written.", c:["OOP","class/object","encapsulation","inheritance/polymorphism/abstraction","code example"] }
  ];
  for (const g of generic) {
    if (result.length >= 10) break;
    result.push({ question:g.q, criteria:g.c });
  }

  const count = difficulty === "Hard" ? Math.min(10, result.length) : difficulty === "Easy" ? Math.min(6, result.length) : Math.min(8, result.length);
  // The interview must not feel like a fixed questionnaire. Shuffle the resume-derived
  // questions every time a session starts, while still keeping them relevant to the resume.
  return shuffle(result).slice(0,count).map((x,i)=>({...x,id:i+1,source: x.question?.toLowerCase().includes("listed") || x.question?.toLowerCase().includes("your") ? "Resume based" : "Technical follow-up"}));
}

function buildHRInterview() {
  return [
    {question:"Tell me about yourself.",criteria:["education/background","skills","experience/projects","career goal"]},
    {question:"Why do you want this role?",criteria:["role interest","skills fit","career reason"]},
    {question:"What are your strengths? Give a real example.",criteria:["strength","specific example","result"]},
    {question:"What is one weakness you are actively improving?",criteria:["real weakness","action taken","progress"]},
    {question:"Tell me about a difficult situation in a project and how you handled it.",criteria:["situation","action","result","learning"]},
    {question:"Tell me about a time you worked in a team.",criteria:["team situation","your contribution","communication","result"]},
    {question:"Why should we hire you?",criteria:["relevant skills","evidence","value you can add"]}
  ].map((x,i)=>({...x,id:i+1}));
}

function tokenizeAnswer(s) {
  return normalize(s).split(" ").filter(Boolean);
}

const synonymGroups = {
  "JDK": ["development kit", "compiler", "javac", "tools"],
  "JRE": ["runtime environment", "run java", "runtime"],
  "JVM": ["virtual machine", "runs bytecode", "bytecode"],
  "person/object detection": ["person detection", "people detection", "object detection", "detect people", "detect persons"],
  "frame processing": ["frames", "video frame", "image frame", "process frame", "frame by frame"],
  "bounding boxes/count": ["bounding box", "boxes", "count people", "person count", "counting"],
  "crowd threshold": ["threshold", "limit", "capacity", "maximum crowd"],
  "zone": ["zone", "area", "region", "location"],
  "count": ["count", "number", "people count", "headcount"],
  "optimization": ["optimize", "optimization", "performance tuning", "improve performance"],
  "multi-camera": ["multiple cameras", "multi camera", "many cameras"],
  "RTSP/CCTV": ["rtsp", "cctv", "security camera", "camera stream"],
  "video/frame": ["video", "frame", "stream"],
  "alert": ["notification", "warning", "alarm", "notify", "alerting"],
  "security": ["security team", "guard", "security personnel", "staff"],
  "edge AI/Jetson": ["edge ai", "edge device", "jetson", "on device", "local inference"],
  "water pollution": ["pollution", "water quality", "contamination", "contaminants"],
  "sensors": ["sensor", "tds", "ph", "turbidity", "orp", "dissolved oxygen", "temperature"],
  "latency": ["delay", "response time", "real time"],
  "bandwidth": ["network bandwidth", "data transfer", "network usage"],
  "scalability": ["scale", "multiple cameras", "load", "horizontal scaling"],
  "FPS": ["frames per second", "frame rate", "fps"],
  "REST API": ["restful api", "api endpoint", "web api"],
  "HTTP method": ["get", "post", "put", "patch", "delete", "http verb"],
  "request/response": ["request", "response", "payload", "body"],
  "status code": ["200", "201", "400", "401", "403", "404", "500", "http status"],
  "validation": ["validate", "validation", "input check", "sanitize"],
  "error handling": ["exception", "error", "catch", "failure handling"],
  "database": ["db", "database", "datastore"],
  "schema/collection": ["schema", "table", "collection", "document"],
  "CRUD": ["create", "read", "update", "delete"],
  "relationship": ["relation", "foreign key", "reference", "one to many", "many to many"],
  "problem solved": ["problem", "issue", "challenge", "solved", "solution"],
  "personal implementation": ["i implemented", "i developed", "i built", "my role", "my contribution", "i worked"],
  "actual usage": ["used", "implemented", "built", "developed", "integrated"],
  "result": ["result", "outcome", "improved", "reduced", "increased", "worked"],
  "root cause": ["root cause", "reason", "cause", "why it happened"],
  "verify": ["test", "tested", "verify", "verified", "confirmed"],
  "OOP": ["object oriented", "object-oriented", "classes", "objects"],
  "class/object": ["class", "object", "instance"],
  "encapsulation": ["data hiding", "private", "getter", "setter"],
  "inheritance/polymorphism/abstraction": ["inheritance", "extends", "polymorphism", "overloading", "overriding", "abstraction", "interface"],
  "code example": ["example", "code", "project"],
  "identity/login": ["login", "identity", "credentials", "verify user", "authentication"],
  "permission/access": ["permission", "role", "access control", "authorization"],
  "token": ["jwt", "token", "bearer"],
  "hash": ["hash", "hashed", "password hash"],
  "salt": ["salt", "salting"],
  "document": ["document", "bson"],
  "collection": ["collection"],
  "NoSQL": ["nosql", "non relational"],
  "Atomicity": ["atomicity", "all or nothing"],
  "Consistency": ["consistency", "valid state"],
  "Isolation": ["isolation", "concurrent transactions"],
  "Durability": ["durability", "persisted", "after commit"],
  "RAM": ["ram", "memory"],
  "disk": ["disk", "storage"],
  "pages": ["page", "paging", "pages"],
  "address space": ["address space", "virtual address"]
};

const junkWords = new Set(["asdf","asdfgh","qwerty","qwertyuiop","test","testing","hello","hiii","hii","random","abc","abcd","xyz","nothing","idk","dontknow","noidea","whatever"]);

function looksLikeJunk(raw) {
  const n = normalize(raw);
  const words = n.split(" ").filter(Boolean);
  if (!words.length) return true;
  const junkCount = words.filter(w=>junkWords.has(w)).length;
  if (junkCount >= Math.max(1, Math.ceil(words.length*0.5))) return true;
  const alpha = n.replace(/[^a-z]/g, "");
  if (alpha.length >= 8) {
    const vowelRatio = (alpha.match(/[aeiou]/g)||[]).length / alpha.length;
    if (vowelRatio < 0.12 || vowelRatio > 0.72) return true;
  }
  return false;
}

function criterionSatisfied(answerNorm, criterion) {
  const c = normalize(criterion);
  const aliases = synonymGroups[criterion] || [];
  if (answerNorm.includes(c)) return true;
  return aliases.some(a=>answerNorm.includes(normalize(a)));
}

function evaluateAnswer(questionObj, answer) {
  const raw = (answer || "").trim();
  const wordCount = tokenizeAnswer(raw).length;
  const criteria = questionObj.criteria || buildCriteria(questionObj.question, "Technical");

  if (!raw) return {score:0,status:"Unattended / no answer",matched:[],missing:criteria,feedback:"No answer was submitted. This question receives 0.",improvement:"Answer the question directly and support the answer with the key technical points requested.",idealAnswer:`Cover: ${criteria.join(", ")}.`};
  if (looksLikeJunk(raw)) return {score:0,status:"Irrelevant / invalid",matched:[],missing:criteria,feedback:"The response appears random, non-meaningful, or unrelated. Strict evaluation gives 0.",improvement:"Do not enter random text. Explain the requested concept with relevant technical details.",idealAnswer:`Cover: ${criteria.join(", ")}.`};
  if (wordCount === 1) return {score:1,status:"Insufficient",matched:[],missing:criteria,feedback:"A one-word answer does not demonstrate sufficient understanding for this interview question.",improvement:"Give a complete explanation and include the key points requested.",idealAnswer:`Cover: ${criteria.join(", ")}.`};
  if (wordCount < 5) return {score:3,status:"Insufficient",matched:[],missing:criteria,feedback:"The answer is far too short to establish correctness.",improvement:"Use complete sentences and explain the concept rather than naming a term.",idealAnswer:`Cover: ${criteria.join(", ")}.`};

  const answerNorm = normalize(raw);
  const matched = criteria.filter(c=>criterionSatisfied(answerNorm,c));
  const missing = criteria.filter(c=>!criterionSatisfied(answerNorm,c));
  const qTokens = [...tokens(questionObj.question)];
  const overlap = qTokens.filter(t=>answerNorm.includes(t)).length;
  const relevance = Math.min(1, overlap / Math.max(2, Math.min(6,qTokens.length)));
  const coverage = matched.length / Math.max(1,criteria.length);
  const depth = Math.min(1, Math.max(0,(wordCount-8)/35));

  let score = Math.round(coverage*65 + relevance*20 + depth*15);
  if (relevance < 0.18) score = Math.min(score, 12);
  if (coverage === 0) score = Math.min(score, 10);
  if (coverage < 0.25) score = Math.min(score, 25);
  if (wordCount < 8) score = Math.min(score, 20);
  if (wordCount < 12 && coverage < 0.5) score = Math.min(score, 35);
  if (coverage >= 0.8 && relevance >= 0.35 && wordCount >= 12) score = Math.max(score, 65);

  score = Math.max(0,Math.min(100,score));
  let status = score >= 80 ? "Strong" : score >= 60 ? "Good but incomplete" : score >= 40 ? "Partial" : score >= 15 ? "Weak" : "Irrelevant / insufficient";
  const feedback = score >= 80 ? "The answer is relevant and covers most of the expected concepts." : score >= 60 ? "The answer is relevant but important concepts or depth are missing." : score >= 40 ? "The answer shows partial understanding but does not cover enough of the expected criteria." : "The answer does not demonstrate sufficient relevant knowledge for this question.";
  return {score,status,matched,missing,feedback,improvement:missing.length?`Add these missing points: ${missing.join(", ")}.`:`Add a concrete example, trade-off, or project connection to make the answer stronger.`,idealAnswer:`A strong answer should directly address the question and cover: ${criteria.join(", ")}.`};
}

async function evaluateWithLLM(questionObj, answer) {
  if (!OPENAI_API_KEY) return null;
  const prompt = `You are a strict technical/HR interview evaluator. Evaluate ONLY the answer to the exact question. Do not give credit for length alone. Empty, random, copied-looking, or irrelevant answers must score 0-10. A one-word answer cannot score above 5 unless the question explicitly asks for one word. Use the supplied criteria as a rubric. Score accuracy, relevance, completeness, and explanation quality. Return ONLY valid JSON with keys: score (0-100 integer), status, matched (array), missing (array), feedback, improvement, idealAnswer. Question: ${questionObj.question}\nCriteria: ${JSON.stringify(questionObj.criteria||[])}\nAnswer: ${answer}`;
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${OPENAI_API_KEY}`}, body:JSON.stringify({model:OPENAI_MODEL,temperature:0,response_format:{type:"json_object"},messages:[{role:"system",content:"Return only JSON."},{role:"user",content:prompt}]})});
    if (!r.ok) return null;
    const d = await r.json();
    const content = d.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    parsed.score=Math.max(0,Math.min(100,Number(parsed.score)||0));
    return parsed;
  } catch { return null; }
}

function authRequired(req,res,next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({error:"Login required."});
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({error:"Invalid or expired login session."});
  }
}

app.get("/api/health", (_,res)=>res.json({ok:true}));

app.post("/api/auth/signup", async (req,res)=>{
  try {
    const {name,email,password} = req.body;
    if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({error:"Name, email and password are required."});
    if (password.length < 6) return res.status(400).json({error:"Password must be at least 6 characters."});
    const users = readJson(USERS_FILE);
    const normalizedEmail = email.trim().toLowerCase();
    if (users.some(u=>u.email===normalizedEmail)) return res.status(409).json({error:"An account with this email already exists."});
    const user = {id:uid(), name:name.trim(), email:normalizedEmail, passwordHash:await bcrypt.hash(password,10), createdAt:new Date().toISOString()};
    users.push(user); writeJson(USERS_FILE,users);
    const token = jwt.sign({id:user.id,email:user.email,name:user.name},JWT_SECRET,{expiresIn:"7d"});
    res.status(201).json({token,user:{id:user.id,name:user.name,email:user.email}});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.post("/api/auth/login", async (req,res)=>{
  try {
    const {email,password} = req.body;
    const users = readJson(USERS_FILE);
    const user = users.find(u=>u.email===email?.trim().toLowerCase());
    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) return res.status(401).json({error:"Invalid email or password."});
    const token = jwt.sign({id:user.id,email:user.email,name:user.name},JWT_SECRET,{expiresIn:"7d"});
    res.json({token,user:{id:user.id,name:user.name,email:user.email}});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get("/api/auth/me", authRequired, (req,res)=>{
  res.json({user:req.user});
});

// In-memory conversation state for the AI Live voice mode. The browser handles
// speech recognition/TTS; this endpoint handles the conversational AI turn.
const liveSessions = new Map();
const liveQuestionState = new Map();

app.post("/api/live-chat", authRequired, async (req,res)=>{
  try {
    const {type="Technical", difficulty="Medium", resumeText="", sessionId, message} = req.body || {};
    if (!String(message||"").trim()) return res.status(400).json({error:"Message is required."});
    const key = `${req.user.id}:${sessionId || "default"}`;
    const previous = liveSessions.get(key) || [];
    const safeHistory = previous.slice(-10);
    const system = `You are HireMind's live ${type} interviewer. Difficulty: ${difficulty}.
Have a natural spoken interview conversation, like a live human interviewer. Do not dump a questionnaire. Respond briefly enough to speak naturally (usually 1-4 sentences), acknowledge the candidate's answer when appropriate, then ask one indirect follow-up or next interview question. Mix the interview topics and do not follow a fixed numeric sequence. You may revisit an earlier topic later, switch between project, technology, fundamentals, architecture and reasoning, and choose the next question based on the conversation. NEVER assume the order of topics in the resume or any supplied list is the order of questioning. Do not number questions or announce a fixed sequence. Avoid repeating a question already asked unless you are intentionally probing a different missing detail. For technical mode, prioritize technologies and projects actually present in the resume text. For HR mode, ask behavioral follow-ups based on the candidate's previous answer. Do not infer emotions, personality, health, or protected traits. Do not give the ideal answer during the live interview. If the candidate is unclear, ask a concise clarification.
Resume context:
${String(resumeText).slice(0,12000)}`;

    let reply = "Thanks. Let’s go a little deeper. Can you explain the specific part you personally implemented and why you chose that approach?";
    if (OPENAI_API_KEY) {
      const payload = {
        model: OPENAI_MODEL,
        temperature: 0.55,
        messages: [
          {role:"system",content:system},
          ...safeHistory,
          {role:"user",content:String(message).slice(0,5000)}
        ]
      };
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${OPENAI_API_KEY}`}, body:JSON.stringify(payload)
      });
      if (r.ok) {
        const d = await r.json();
        reply = d.choices?.[0]?.message?.content?.trim() || reply;
      }
    } else {
      // Offline fallback still uses a resume-grounded, non-sequential question pool.
      const state = liveQuestionState.get(key) || [];
      const pool = type === "Technical"
        ? buildTechnicalInterview(String(resumeText || ""), difficulty)
        : shuffle(buildHRInterview());
      const unused = pool.filter(q => !state.includes(q.question));
      const lower=String(message).toLowerCase();
      if (type === "Technical" && unused.length) {
        const q = unused[Math.floor(Math.random()*unused.length)];
        reply = `Thanks. Let’s switch focus for a moment. ${q.question}`;
        state.push(q.question);
        liveQuestionState.set(key,state.slice(-20));
      } else if(type==="Technical") {
        if(lower.includes("project")||lower.includes("system")) reply="Good. Let’s probe a different part of your implementation. What design decision did you make, and what trade-off did it involve?";
        else if(lower.includes("python")||lower.includes("java")||lower.includes("react")||lower.includes("node")||lower.includes("sql")) reply="Let’s change direction. What real problem did you solve with that technology, and how did you verify the solution?";
        else reply="Let’s approach your experience from another angle. What was one technical challenge you faced, and how did you solve it?";
      } else {
        const q = unused[0];
        if(q) { reply=`Thanks. Let’s explore another part of your experience. ${q.question}`; state.push(q.question); liveQuestionState.set(key,state.slice(-20)); }
        else if(lower.includes("team")||lower.includes("project")) reply="Thanks. What did you personally do in that situation, and what was the result?";
        else if(lower.includes("strength")||lower.includes("weakness")) reply="Can you support that with one specific example from college, an internship, or a project?";
        else reply="That’s useful context. Let’s switch topics: what did you learn from that experience, and how would you apply it in this role?";
      }
    }
    const next=[...safeHistory,{role:"user",content:String(message).slice(0,5000)},{role:"assistant",content:reply}].slice(-12);
    liveSessions.set(key,next);
    res.json({reply});
  } catch(e) { res.status(500).json({error:e.message}); }
});

function buildFallbackLesson(subject, concept) {
  const s = String(subject || "").toLowerCase();
  const c = String(concept || "");
  let definition = `${c} is a core ${subject} concept. In an interview, explain what it is, why it exists, how it works, and when you would use it.`;
  let how = `Start with the basic idea of ${c}, identify its main components, then explain the normal execution or usage flow. Finally mention a practical trade-off or limitation.`;
  let example = `Example: In a small ${subject} project, you would use ${c} when the problem requires the behavior described by this concept.`;
  let mistakes = `Common mistakes: memorizing the definition without understanding the flow, confusing it with a related concept, and giving no practical example.`;
  if (s === "java") {
    if (/data types/i.test(c)) { definition="Java data types define what kind of value a variable can store. Java has 8 primitive types plus reference types such as String, arrays, classes, interfaces and enums."; how="Primitive values are stored directly as values; reference variables hold references to objects. Java is statically typed, so a variable's type is known at compile time."; example="int age = 20; double price = 99.5; char grade = 'A'; boolean active = true; String name = \"Subiksha\";"; mistakes="Common mistakes: using int for a value that needs long, forgetting L for a long literal, forgetting F for a float literal, and confusing char single quotes with String double quotes."; }
    else if (/collections/i.test(c)) { definition="Java Collections are interfaces and classes used to store and manipulate groups of objects, such as List, Set, Queue and Map."; how="Choose the collection from the access and uniqueness requirement: List preserves order, Set focuses on uniqueness, Queue models processing order, and Map stores key-value pairs."; example="List<String> names = new ArrayList<>(); names.add(\"Asha\"); Set<Integer> ids = new HashSet<>(); Map<Integer,String> users = new HashMap<>();"; mistakes="Common mistakes: choosing a collection without considering lookup/insertion needs, modifying a collection incorrectly during iteration, and confusing Map with Collection."; }
    else if (/inheritance/i.test(c)) { definition="Inheritance lets a child class reuse and extend fields and methods of a parent class."; how="Use extends for class inheritance. The child inherits accessible members and can add new behavior or override methods."; example="class Animal { void sound(){} } class Dog extends Animal { void bark(){} }"; mistakes="Common mistakes: assuming private members are directly inherited, using inheritance when composition is simpler, and confusing overriding with overloading."; }
    else if (/polymorphism/i.test(c)) { definition="Polymorphism means one interface or parent type can represent different concrete implementations."; how="Compile-time polymorphism commonly uses method overloading; runtime polymorphism uses method overriding and dynamic method dispatch."; example="Animal a = new Dog(); a.sound(); can execute Dog's overridden sound() at runtime."; mistakes="Do not confuse overloading with overriding or assume every type conversion is polymorphism."; }
    else if (/encapsulation/i.test(c)) { definition="Encapsulation groups data and behavior and controls direct access to internal state."; how="Keep fields private and expose controlled methods such as getters/setters or domain-specific operations."; example="private double balance; public void deposit(double amount){ if(amount>0) balance += amount; }"; mistakes="Making every field public defeats data protection; setters should validate data when validation matters."; }
    else if (/exception/i.test(c)) { definition="Exception handling manages abnormal situations without abruptly terminating normal program flow."; how="Use try for risky code, catch for handling a specific exception, finally for cleanup, and throw/throws when propagating or creating exceptions."; example="try { int x = 10/0; } catch (ArithmeticException e) { System.out.println(\"Invalid division\"); }"; mistakes="Do not catch Exception everywhere, do not silently ignore errors, and do not use exceptions as normal loop control."; }
  } else if (s === "python") {
    if (/list|tuple|set|dictionary/i.test(c)) { definition="Python's main built-in collection types differ in ordering, mutability and uniqueness: list is ordered/mutable, tuple is ordered/immutable, set stores unique values, and dict stores key-value pairs."; how="Choose the type based on whether you need mutation, duplicate values, ordering and key-based lookup."; example="items=[1,2,2]; point=(10,20); unique={1,2}; user={\"name\":\"Subiksha\"}"; mistakes="Confusing {} with an empty set, modifying tuples, assuming sets preserve a meaningful order, and using a list when key lookup is the real requirement."; }
    else if (/decorator/i.test(c)) { definition="A decorator is a callable that wraps another function or class to add behavior without changing its core source code."; how="A decorator receives a function, defines wrapper behavior, and returns the wrapper; @name is syntactic sugar for applying it."; example="@log\ndef add(a,b): return a+b"; mistakes="Forgetting functools.wraps, changing function arguments accidentally, or using a decorator when a normal helper function is clearer."; }
  } else if (s === "dbms") {
    if (/normalization/i.test(c)) { definition="Normalization organizes relational data to reduce redundancy and update anomalies."; how="Split data into related tables according to functional dependencies and normal-form rules such as 1NF, 2NF, 3NF and BCNF."; example="Instead of repeating department name in every student row, keep Department(id,name) and Student(id,name,department_id)."; mistakes="Over-normalizing without considering query needs, ignoring functional dependencies, and confusing normalization with indexing."; }
    else if (/acid/i.test(c)) { definition="ACID describes four desirable transaction properties: Atomicity, Consistency, Isolation and Durability."; how="A transaction completes all-or-nothing, preserves valid rules, isolates concurrent work according to the isolation level, and keeps committed data after failures."; example="A bank transfer debits one account and credits another as one transaction."; mistakes="ACID is not a synonym for backup, and isolation level affects concurrency behavior."; }
  } else if (s.includes("operating systems")) {
    if (/deadlock/i.test(c)) { definition="Deadlock is a state where processes wait indefinitely for resources held by one another."; how="The classic necessary conditions are mutual exclusion, hold and wait, no preemption, and circular wait. Prevention breaks a condition; avoidance such as Banker's algorithm checks safe states."; example="P1 holds printer and waits for scanner while P2 holds scanner and waits for printer."; mistakes="Deadlock is different from starvation; merely using locks does not automatically mean deadlock."; }
    else if (/process|thread/i.test(c)) { definition="A process is a running program with its own address space; a thread is an execution unit within a process that usually shares process resources."; how="Processes provide stronger isolation; threads are lighter and communicate through shared memory, which also creates synchronization risks."; example="A web server may use multiple threads to handle concurrent requests inside a process."; mistakes="Do not say threads have completely separate memory; they share process resources but each thread has its own stack and execution state."; }
  } else if (s === "react") {
    if (/usestate/i.test(c)) { definition="useState is a React Hook that gives a function component state and a setter that schedules a re-render."; how="Initialize state, read the current value, then call the setter when an event or effect needs to update it. State updates are scheduled rather than immediate variable mutation."; example="const [count,setCount]=useState(0); setCount(c=>c+1);"; mistakes="Do not mutate state objects directly; use the setter and functional updates when the next value depends on the previous value."; }
    else if (/useeffect/i.test(c)) { definition="useEffect runs side-effect logic after rendering when its dependency conditions require it."; how="Place external synchronization such as API calls, subscriptions or timers in the effect and return a cleanup function when needed."; example="useEffect(()=>{ fetch('/api/users').then(...); }, []);"; mistakes="Do not use effects for every calculation; derived values often belong directly in render logic."; }
  } else if (s.includes("javascript")) {
    if (/closure/i.test(c)) { definition="A closure is a function together with access to variables from its surrounding lexical scope, even after that outer function has returned."; how="JavaScript preserves the referenced lexical environment so the inner function can continue using those variables."; example="function counter(){ let n=0; return ()=>++n; }"; mistakes="Do not confuse closure with simply having a nested function; the key is retained access to outer lexical variables."; }
    else if (/promise|async/i.test(c)) { definition="A Promise represents the eventual result of an asynchronous operation: pending, fulfilled or rejected."; how="Use then/catch or async/await to consume the result, and handle rejection explicitly."; example="const data = await fetch('/api/data');"; mistakes="Forgetting await, not handling rejection, or assuming async code blocks the JavaScript thread."; }
  } else if (s.includes("mongodb")) {
    if (/aggregation/i.test(c)) { definition="MongoDB aggregation processes documents through a pipeline of stages to filter, transform, group and calculate results."; how="Common stages include $match, $project, $group, $sort and $lookup; stage order affects performance and results."; example="db.sales.aggregate([{$match:{year:2026}},{$group:{_id:'$product',total:{$sum:'$amount'}}}])"; mistakes="Putting an expensive stage too early, returning unnecessary fields, and forgetting that schema design can sometimes remove the need for complex aggregation."; }
  }
  return `1. Definition\n${definition}\n\n2. Why it matters\n${c} matters because it appears in real ${subject} development and interview questions. You should be able to explain the problem it solves and compare it with closely related alternatives.\n\n3. How it works\n${how}\n\n4. Practical example\n${example}\n\n5. Common mistakes\n${mistakes}\n\n6. Interview questions\n• What is ${c}?\n• Why is ${c} used?\n• How does ${c} work?\n• Give a real project example.\n• What is one limitation or common mistake?\n\n7. Project connection\nConnect ${c} to one of your own projects. State exactly where you used it, what you personally implemented, and what result or problem it addressed.\n\n8. Quick revision\nDefinition → purpose → working → example → comparison/trade-off → common mistakes → project connection.`;
}

app.post("/api/study/explain", authRequired, async (req,res)=>{
  try {
    const {subject="", concept=""}=req.body||{};
    if(!concept.trim()) return res.status(400).json({error:"Concept is required."});
    let lesson = buildFallbackLesson(subject, concept);
    if(OPENAI_API_KEY){
      const payload={model:OPENAI_MODEL,temperature:.35,messages:[{role:"system",content:"You are a technical study tutor. Teach one interview concept in simple English. Structure exactly with: Definition, Why it matters, How it works, Example, Common mistakes, Interview questions, Project connection, Quick revision. Be accurate and practical. Do not invent project details."},{role:"user",content:`Subject: ${subject}\nConcept: ${concept}`}]};
      const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${OPENAI_API_KEY}`},body:JSON.stringify(payload)});
      if(r.ok){const d=await r.json();lesson=d.choices?.[0]?.message?.content?.trim()||lesson;}
    }
    res.json({lesson});
  } catch(e){res.status(500).json({error:e.message});}
});

app.get("/api/interview/history", authRequired, (req,res)=>{
  const history = readJson(HISTORY_FILE).filter(x=>x.userId===req.user.id).slice(-20).reverse();
  res.json(history);
});

app.get("/api/questions/:subject", (req,res)=>{
  const qs = questions[req.params.subject] || webQuestions[req.params.subject];
  if(!qs) return res.status(404).json({error:"Subject not found"});
  res.json(qs.map((question,i)=>({id:i+1,question,difficulty:i<17?"Easy":i<35?"Medium":"Hard",category:"Interview Preparation"})));
});

app.post("/api/resume/analyze", authRequired, upload.single("resume"), async (req,res)=>{
  try {
    if(!req.file) return res.status(400).json({error:"Resume file is required"});
    let text = "";
    if(req.file.mimetype === "application/pdf"){
      const data = await pdfParse(req.file.buffer);
      text = data.text || "";
    } else {
      return res.status(400).json({error:"Please upload the PDF version of your resume for reliable analysis."});
    }
    const extracted = text.slice(0,20000);
    const matchedRoles = roleMatch(text);
    const skills = extractSkills(text);
    const projects = detectProjects(text);
    let resumeInterviewQuestions = buildTechnicalInterview(text,"Hard").slice(0,10).map(x=>({question:x.question,criteria:x.criteria,source:x.source||"Resume based"}));
    let resumeEvidence = [];

    if (OPENAI_API_KEY) {
      const prompt = `Analyze this candidate resume for an interview platform. Return ONLY valid JSON with keys: projects (array of objects with name, technologies, candidateContribution, evidence), skills (array of strings), interviewQuestions (array of 10 objects with question, criteria array, sourceEvidence). Questions MUST be directly grounded in facts appearing in the resume; do not invent projects, technologies, employers, metrics or responsibilities. Prefer questions that ask what the candidate actually built, implemented, chose, debugged, measured, or learned. Mix project, technology, architecture, fundamentals and reasoning questions instead of following resume order. Resume text:\n${extracted}`;
      try {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${OPENAI_API_KEY}`},body:JSON.stringify({model:OPENAI_MODEL,temperature:.2,response_format:{type:"json_object"},messages:[{role:"system",content:"You are a strict resume parser and interview question generator. Use only evidence present in the resume."},{role:"user",content:prompt}]})});
        if (r.ok) {
          const d = await r.json();
          const parsed = JSON.parse(d.choices?.[0]?.message?.content || "{}");
          if (Array.isArray(parsed.skills) && parsed.skills.length) skills.splice(0,skills.length,...parsed.skills);
          if (Array.isArray(parsed.projects) && parsed.projects.length) {
            projects.splice(0,projects.length,...parsed.projects.map(x=>typeof x === "string" ? x : x.name).filter(Boolean));
            resumeEvidence = parsed.projects;
          }
          if (Array.isArray(parsed.interviewQuestions) && parsed.interviewQuestions.length) {
            resumeInterviewQuestions = parsed.interviewQuestions.slice(0,12).map(x=>({question:x.question,criteria:Array.isArray(x.criteria)?x.criteria:[],source:x.sourceEvidence||"Directly grounded in resume"}));
          }
        }
      } catch {}
    }

    res.json({
      fileName:req.file.originalname,
      summary:`Resume analyzed for ${req.user.name}. The interview question bank is built from the technologies, projects and experience found in this resume.`,
      skills, projects, resumeEvidence, resumeInterviewQuestions,
      extractedText:extracted, matchedRoles
    });
  } catch(e){ res.status(500).json({error:e.message}); }
});

app.post("/api/interview/start", authRequired, (req,res)=>{
  const {type="Technical",difficulty="Medium",duration=10,resumeText="",resumeQuestions=[]}=req.body;
  let built;
  if (type === "HR") {
    built = shuffle(buildHRInterview()).map((x,i)=>({...x,id:i+1}));
  } else if (Array.isArray(resumeQuestions) && resumeQuestions.length) {
    const count = difficulty === "Hard" ? Math.min(10,resumeQuestions.length) : difficulty === "Easy" ? Math.min(6,resumeQuestions.length) : Math.min(8,resumeQuestions.length);
    built = shuffle(resumeQuestions).slice(0,count).map((x,i)=>({...x,id:i+1,source:x.source||"Resume based"}));
  } else {
    built = buildTechnicalInterview(resumeText,difficulty);
  }
  res.json({type,difficulty,duration,questions:built,personalized:type==="Technical" && Boolean(resumeText)});
});

app.post("/api/interview/evaluate", authRequired, async (req,res)=>{
  try {
    const answers=req.body.answers||[];
    const totalQuestions=Number(req.body.totalQuestions)||answers.length;
    if (!answers.length) {
      const result={overallScore:0,questionsAttended:0,questionsUnattended:totalQuestions,questionsTotal:totalQuestions,strongAreas:[],areasToImprove:["No questions were answered."],questionResults:[],badQuestions:[],feedback:"Strict evaluation: no answers were submitted. Score is 0."};
      res.json(result); return;
    }
    const questionResults=[];
    for (const a of answers) {
      const q=typeof a.question==="string"?{question:a.question,criteria:a.criteria}:a.question;
      const fallback=evaluateAnswer(q,a.answer||"");
      const llm=await evaluateWithLLM(q,a.answer||"");
      const evaluated=llm ? {...fallback,...llm,score:Math.max(0,Math.min(100,Number(llm.score)||0))} : fallback;
      // Never allow LLM to reward obvious empty/junk input.
      if (!String(a.answer||"").trim() || looksLikeJunk(a.answer||"") || tokenizeAnswer(a.answer||"").length<2) evaluated.score=Math.min(evaluated.score,3);
      questionResults.push({question:q.question,answer:a.answer||"",...evaluated});
    }
    const overallScore=Math.round(questionResults.reduce((sum,x)=>sum+x.score,0)/Math.max(1,totalQuestions));
    const bad=questionResults.filter(x=>x.score<50);
    const strong=questionResults.filter(x=>x.score>=80);
    const result={
      overallScore,
      questionsAttended:answers.length,
      questionsUnattended:Math.max(0,totalQuestions-answers.length),
      questionsTotal:totalQuestions,
      strongAreas:strong.length?["Questions with strong technical/relevant answers"]:[],
      areasToImprove:bad.length?["Review every question below 50/100","Improve relevance, correctness, completeness and technical depth"]:["Add stronger examples and trade-offs"],
      questionResults,
      badQuestions:bad.map(x=>({question:x.question,score:x.score,status:x.status,reason:x.feedback,missing:x.missing})),
      feedback:overallScore<40?"Strict evaluation: the answers did not demonstrate enough relevant knowledge. Review all low-scoring questions before retrying.":overallScore<70?"Strict evaluation: several answers were incomplete or partially correct. Use the missing-points section for targeted revision.":"Strict evaluation: the overall answers demonstrate reasonable understanding. Review every question below 75 for consistency."
    };
    const history=readJson(HISTORY_FILE);
    history.push({id:uid(),userId:req.user.id,userName:req.user.name,type:req.body.type||"Technical",difficulty:req.body.difficulty||"Medium",overallScore,date:new Date().toISOString(),questionsAttended:answers.length,questionsUnattended:Math.max(0,totalQuestions-answers.length),questionResults});
    writeJson(HISTORY_FILE,history);
    res.json(result);
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.use((err,_,res,next)=>{
  if(err) return res.status(400).json({error:err.message});
  next();
});

app.listen(PORT,()=>console.log(`HireMind backend running on http://localhost:${PORT}`));
