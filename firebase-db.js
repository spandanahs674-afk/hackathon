// firebase-db.js

// 1. Firebase SDK Imports
// These imports are for the modular SDK (version 9 and above)
import { initializeApp } from 'firebase/app';
import {
  getFirestore,           // Main Firestore service
  collection,            // Reference to a collection
  doc,                   // Reference to a document
  addDoc,                // Add a new document to a collection
  updateDoc,             // Update an existing document
  deleteDoc,             // Delete a document
  query,                 // Construct a query
  where,                 // Filter query results
  onSnapshot             // Real-time listeners
} from 'firebase/firestore';

// 2. Firebase App Initialization
// IMPORTANT: You MUST replace the placeholder values below with your
// actual Firebase project configuration. You can find this in your
// Firebase console under Project settings -> Your apps.
// The projectId is already filled in from your project details.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // <--- REPLACE THIS
  authDomain: "sample-firebase-ai-app-8955f.firebaseapp.com",
  projectId: "sample-firebase-ai-app-8955f",
  storageBucket: "sample-firebase-ai-app-8955f.appspot.com", // Usually projectId.appspot.com
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // <--- REPLACE THIS (if using FCM)
  appId: "YOUR_APP_ID", // <--- REPLACE THIS
  measurementId: "YOUR_MEASUREMENT_ID" // <--- REPLACE THIS (if using Google Analytics)
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the Firestore service
const db = getFirestore(app);

// --- Firestore Data Models and Interactions ---

/**
 * Adds or updates a user's profile in the 'users' collection.
 * This should typically be called after a user signs up or logs in via Firebase Authentication.
 * @param {string} userId - The Firebase Authentication User ID (UID).
 * @param {object} userData - An object containing user data (e.g., { name: 'John Doe', email: 'john@example.com' }).
 */
export async function addUserProfile(userId, userData) {
  try {
    const userRef = doc(db, 'users', userId); // Reference to a specific user document
    // `merge: true` ensures that if the document already exists, new fields are added
    // and existing fields are updated without overwriting the entire document.
    await updateDoc(userRef, userData, { merge: true });
    console.log(`User profile for ${userId} updated/created successfully.`);
  } catch (error) {
    console.error("Error adding/updating user profile:", error);
    throw error; // Re-throw to allow calling code to handle
  }
}

/**
 * Creates a new project in the 'projects' collection.
 * @param {string} creatorId - The Firebase Authentication User ID of the project creator.
 * @param {object} projectData - An object containing initial project details
 *   (e.g., { name: 'My New Project', description: '...', members: ['userId1', 'userId2'] }).
 * @returns {Promise<string>} A promise that resolves with the ID of the newly created project.
 */
export async function addProject(creatorId, projectData) {
  try {
    const projectsColRef = collection(db, 'projects'); // Reference to the 'projects' collection
    const newProjectRef = await addDoc(projectsColRef, {
      ...projectData,
      creatorId: creatorId,
      createdAt: new Date(), // Timestamp for when the project was created
      members: projectData.members || [creatorId] // Ensure creator is always a member
    });
    console.log("New project added with ID:", newProjectRef.id);
    return newProjectRef.id;
  } catch (error) {
    console.error("Error adding project:", error);
    throw error;
  }
}

/**
 * Sets up a real-time listener for projects a user is a member of.
 * This function is perfect for your "Project List/Dashboard Screen".
 * @param {string} userId - The Firebase Authentication User ID.
 * @param {function(Array<object>)} callback - A function that will be called
 *   with the updated list of projects whenever they change in Firestore.
 * @returns {function()} An unsubscribe function. Call this function to stop
 *   listening for updates (e.g., when a user logs out or navigates away).
 */
export function listenToUserProjects(userId, callback) {
  const projectsColRef = collection(db, 'projects');
  // Query to find projects where the 'members' array field contains the current userId.
  const q = query(projectsColRef, where('members', 'array-contains', userId));

  console.log(`Setting up real-time listener for projects for user: ${userId}`);

  // `onSnapshot` sets up the real-time listener.
  const unsubscribe = onSnapshot(q, (snapshot) => {
    // Map the snapshot documents to plain JavaScript objects, including their IDs.
    const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log("Real-time projects update:", projects);
    callback(projects); // Call the provided callback with the new data
  }, (error) => {
    console.error("Error listening to user projects:", error);
    // You might want to handle this error more gracefully in your UI
  });

  return unsubscribe; // Return the unsubscribe function
}

/**
 * Adds a new task to a specific project. Tasks are stored in a subcollection
 * named 'tasks' under each project document.
 * @param {string} projectId - The ID of the project the task belongs to.
 * @param {object} taskData - An object containing initial task details
 *   (e.g., { title: 'Do something', description: '...', assigneeId: '...', dueDate: new Date(), status: 'todo' }).
 * @returns {Promise<string>} A promise that resolves with the ID of the newly created task.
 */
export async function addTaskToProject(projectId, taskData) {
  try {
    // Reference to the 'tasks' subcollection within a specific project document.
    const tasksColRef = collection(db, 'projects', projectId, 'tasks');
    const newTaskRef = await addDoc(tasksColRef, {
      ...taskData,
      createdAt: new Date(), // Timestamp for when the task was created
      status: taskData.status || 'todo' // Default status if not provided
    });
    console.log(`New task added to project ${projectId} with ID: ${newTaskRef.id}`);
    return newTaskRef.id;
  } catch (error) {
    console.error("Error adding task:", error);
    throw error;
  }
}

/**
 * Sets up a real-time listener for tasks within a specific project.
 * This is crucial for your "Task List/Board View Screen".
 * @param {string} projectId - The ID of the project whose tasks you want to listen to.
 * @param {function(Array<object>)} callback - A function that will be called
 *   with the updated list of tasks whenever they change.
 * @returns {function()} An unsubscribe function. Call this function to stop
 *   listening for updates.
 */
export function listenToProjectTasks(projectId, callback) {
  // Reference to the 'tasks' subcollection within the specified project.
  const tasksColRef = collection(db, 'projects', projectId, 'tasks');
  const q = query(tasksColRef); // You can add ordering (e.g., `orderBy('dueDate')`) or filtering here

  console.log(`Setting up real-time listener for tasks in project: ${projectId}`);

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log("Real-time tasks update:", tasks);
    callback(tasks);
  }, (error) => {
    console.error("Error listening to project tasks:", error);
  });

  return unsubscribe;
}

/**
 * Updates an existing task within a project.
 * @param {string} projectId - The ID of the project the task belongs to.
 * @param {string} taskId - The ID of the task to update.
 * @param {object} updates - An object containing the fields to update
 *   (e.g., { status: 'done', assigneeId: 'new_user_id', description: '...' }).
 */
export async function updateTask(projectId, taskId, updates) {
  try {
    // Reference to a specific task document within its project's subcollection.
    const taskRef = doc(db, 'projects', projectId, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: new Date() // Add/update a timestamp for last modification
    });
    console.log(`Task ${taskId} in project ${projectId} updated successfully.`);
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
}

/**
 * Deletes a task from a project.
 * @param {string} projectId - The ID of the project the task belongs to.
 * @param {string} taskId - The ID of the task to delete.
 */
export async function deleteTask(projectId, taskId) {
  try {
    const taskRef = doc(db, 'projects', projectId, 'tasks', taskId);
    await deleteDoc(taskRef);
    console.log(`Task ${taskId} in project ${projectId} deleted successfully.`);
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
}

// --- Example Usage (Commented Out) ---
/*
// To use these functions in your app, you would import them and call them
// based on user interactions (e.g., button clicks, form submissions).

// Example: How you might use these functions alongside Firebase Authentication
// import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth'; // You'll use email/password auth
// const auth = getAuth(app); // Get a reference to the Auth service

// onAuthStateChanged(auth, async (user) => {
//   if (user) {
//     const currentUserId = user.uid;
//     console.log("Authenticated user ID:", currentUserId);

//     // Example 1: Add/Update user profile after login
//     // await addUserProfile(currentUserId, { name: 'Synergy User', email: user.email || 'unknown@example.com' });

//     // Example 2: Listen to projects and potentially create a new one
//     const unsubscribeProjects = listenToUserProjects(currentUserId, (projects) => {
//       if (projects.length === 0) {
//         console.log("No projects found for user. Creating a demo project...");
//         // addProject(currentUserId, { name: "SynergySphere Demo", description: "Our first project!" })
//         //   .then(newProjectId => {
//         //     console.log("Demo project created:", newProjectId);
//         //     // Add a demo task to the new project
//         //     addTaskToProject(newProjectId, {
//         //       title: "Explore Firebase Firestore",
//         //       description: "Learn about collections, documents, and real-time listeners.",
//         //       assigneeId: currentUserId,
//         //       dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
//         //       status: 'todo'
//         //     });
//         //   })
//         //   .catch(err => console.error("Failed to create demo project:", err));
//       } else {
//         const firstProjectId = projects[0].id;
//         console.log("Listening to tasks for project:", firstProjectId);
//         // Example 3: Listen to tasks for the first project
//         const unsubscribeTasks = listenToProjectTasks(firstProjectId, (tasks) => {
//           console.log(`Tasks in project ${firstProjectId}:`, tasks);
//           // Example 4: Update a task's status after some condition (e.g., user interaction)
//           // if (tasks.length > 0 && tasks[0].status === 'todo') {
//           //   console.log("Updating first task status to 'in-progress' after 3 seconds...");
//           //   setTimeout(() => {
//           //     updateTask(firstProjectId, tasks[0].id, { status: 'in-progress' })
//           //       .catch(err => console.error("Error updating task:", err));
//           //   }, 3000);
//           // }
//         });
//         // Remember to call unsubscribeTasks() when the component showing tasks unmounts
//         // setTimeout(() => {
//         //   console.log("Unsubscribing from tasks listener after 10 seconds.");
//         //   unsubscribeTasks();
//         // }, 10000);
//       }
//     });

//     // Remember to call unsubscribeProjects() when the user logs out or the app closes
//     // setTimeout(() => {
//     //   console.log("Unsubscribing from projects listener after 20 seconds.");
//     //   unsubscribeProjects();
//     // }, 20000);

//   } else {
//     // User is signed out. For development, you might sign in anonymously or redirect to login.
//     // console.log("No user signed in. Attempting anonymous sign-in for demo.");
//     // signInAnonymously(auth).catch((error) => console.error("Anonymous sign-in error:", error));
//   }
// });
*/

This file provides modular functions you can import and use in your frontend code (e.g., in your React, Angular, Vue, or vanilla JavaScript components). Remember to install the Firebase SDK in your project:

```bash
npm install firebase
# or
yarn add firebase
