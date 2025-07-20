# NoCodeApiBuilder-BE

NoCodeApiBuilder-BE is the backend for a no-code API builder platform. It allows users to create, manage, and execute workflows and APIs without writing code. The backend is built with Node.js, Express, and MongoDB, and supports user authentication, project management, workflow execution, secrets management, and more.

## Features

- User authentication (JWT-based)
- Project and workflow management
- Dynamic workflow execution
- Secrets and environment variable management
- Rate limiting and CORS configuration per project
- Real-time workflow execution support
- API statistics and analytics

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher recommended)
- MongoDB instance (local or cloud)

### Installation

1. Clone the repository:
   ```sh
   git clone <repo-url>
   cd NoCodeApiBuilder-BE
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file in the root directory and set the following variables:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/nocodeapibuilder
   JWT_SECRET=your_jwt_secret
   ALLOWED_ORIGINS=http://localhost:3000
   ```

### Running the Server

Start the development server:

```sh
npm run dev
```

Or start the production server:

```sh
npm start
```

The server will run on the port specified in your `.env` file (default: 5000).

## Folder Structure

```
NoCodeApiBuilder-BE/
├── app.js                  # Express app setup
├── index.js                # Entry point
├── config/                 # Database and config files
├── controllers/            # Route controllers
├── helpers/                # Helper utilities
├── middleware/             # Express middleware (auth, rate limiter, etc.)
├── models/                 # Mongoose models
├── routes/                 # API route definitions
├── services/               # Business logic and services
├── utils/                  # Utility functions (logger, executors, etc.)
├── tests/                  # Test files
├── types/                  # Type definitions
├── test-json/              # Sample workflow JSONs
├── package.json            # Project metadata and scripts
└── README.md               # Project documentation
```

## Contribution Guidelines

1. Fork the repository and create your branch from `main`.
2. Write clear, concise commit messages.
3. Add tests for new features and bug fixes.
4. Ensure code passes linting and tests before submitting a PR.
5. Open a pull request and describe your changes.

## License

This project is licensed under the MIT License.
