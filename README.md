# Exam Builder Frontend

Exam Builder is a React and Vite frontend for an exam-practice platform focused on science revision. It allows students to generate exam-style questions, write answers, receive AI-assisted marking and feedback, and review performance over time.

The application is designed around real revision workflows rather than generic quiz mechanics. Students can choose a qualification, exam board, and topic area, complete structured question sessions, and use saved results to identify strengths and weaknesses.

## Project Overview

Exam Builder is built for students preparing for GCSE Science and A-Level Biology assessments. The current frontend supports authenticated study sessions, plan-based access control, performance history, account management, legal and billing pages, and specification reference links.

### Core Objectives

- Help students practise exam-style written responses, not just multiple-choice recall.
- Provide fast marking and targeted feedback after each study session.
- Support board-aware revision for OCR, AQA, and parts of Edexcel.
- Give students a measurable record of progress across saved question sessions.
- Offer a clear free-to-paid upgrade path by qualification.

### Target Users

- GCSE Science students revising Biology, Chemistry, Physics, or Combined Science.
- A-Level Biology students preparing for OCR, AQA, or selected Edexcel specifications.
- Students who want immediate feedback between teacher-marked assessments.
- Learners who want topic-by-topic performance tracking instead of one-off quizzes.

## User Experience

The app is structured around a straightforward study flow:

1. Create an account or log in.
2. Choose a qualification and exam board.
3. Select the relevant topic, subtopic, and, where available, subcategory.
4. Generate a question set.
5. Write answers and submit them for marking.
6. Review question-level feedback and save the session.
7. Return to the progress area to review trends and weak areas.

The homepage reinforces this flow with a product preview, exam-answer example, feedback sample, and direct calls to action into registration or the question generator.

## Main Features

### Authentication and Account Access

- User registration with username, email, password, and password confirmation.
- Login using email and password.
- JWT-based session handling with automatic access-token refresh.
- Guest-only routes for login and registration.
- Protected routes for account, question generation, and progress pages.
- Logout support with backend token invalidation.

### Account Recovery and Verification

- Forgot password flow with reset email request.
- Password reset confirmation via `uid` and `token` query parameters.
- Email verification flow with confirmation links.
- In-app email verification notices for signed-in users.

### Question Generation

- Qualification-aware revision flow for GCSE Science and A-Level Biology.
- Exam board selection for OCR, AQA, and Edexcel where supported.
- GCSE-specific filters for subject and tier.
- Topic, subtopic, and subcategory selection driven by backend content endpoints.
- Variable question counts for paid users.
- Free-plan restriction that limits locked qualifications to a smaller daily allowance.
- AQA A-Level 25-mark essay mode with a built-in 25-minute timer.
- Session-leave protection to prevent accidental loss of in-progress answers.

### Marking and Feedback

- Batch submission and marking of generated answers.
- Question-level feedback showing score, marks available, and written improvement feedback.
- Summary feedback for strengths and improvements across a session.
- Marked-answer previewing on the homepage to explain the product before sign-up.

### Results and Progress Tracking

- Saved question-session history.
- Detailed performance analytics for paid access.
- Qualification-specific summaries for GCSE and A-Level.
- Charts built with Recharts, including trend, breakdown, and performance views.
- Topic and subtopic analysis to show stronger and weaker revision areas.
- Support for essay-session reporting alongside standard question sessions.
- Session resume helpers that allow the user to reload a similar setup and start another practice run.
- Tracking reset support to start a new performance period from the account area.

### Plans, Billing, and Access Control

- Free-plan experience with limited daily usage.
- Qualification-specific upgrades for GCSE access, A-Level access, or both.
- Account-level membership display showing current access state.
- Upgrade calls to action surfaced in navigation, homepage, generator, and account pages.
- Checkout-session creation through the backend billing flow.
- Paid-plan messaging and legal terms for premium access.

### Supporting Pages

- Home landing page with feature messaging and product preview.
- Account page with plan status, summary cards, theme toggle, and upgrade area.
- Progress page with results history and analytics.
- Specification page with direct links to official OCR and AQA specification documents.
- Access denied page for blocked routes or restricted access.
- Custom 404 page.
- Legal pages for terms of service, privacy policy, refund policy, and paid plan terms.

## Qualification and Exam Support

The current frontend is centered on science revision and exposes the following study paths:

- GCSE Science support includes OCR and AQA routes, with subject and tier selection required before topic data is loaded.
- A-Level Biology support includes OCR and AQA, with Edexcel surfaced through specification selection in the generator.

The specification reference page groups official links for OCR Gateway and AQA GCSE routes, plus OCR and AQA A-Level Biology documentation.

## Route Map

Public routes:

- `/`
- `/access-denied`
- `/specification`
- `/terms`
- `/privacy-policy`
- `/paid-plan-terms`
- `/refund-policy`
- `/forgot-password`
- `/reset-password`
- `/verify-email`

Guest-only routes:

- `/login`
- `/register`

Protected routes:

- `/account`
- `/progress`
- `/question-generator`
- `/my-results`

`/my-results` currently redirects to the progress area.

## Tech Stack

### Core Frontend

- React 18
- Vite 7
- React Router DOM 7

### UI and Styling

- CSS modules/files organised by page and component
- Bootstrap 5
- React Bootstrap

### Data and Authentication

- Axios
- jwt-decode
- Browser `localStorage` for token and lightweight session persistence

### Analytics and Visualisation

- Recharts

### Tooling

- ESLint 9
- `@vitejs/plugin-react`

## Backend Integration

The frontend communicates with a deployed API using Axios. The API base URL is configured through `VITE_API_BASE_URL` and falls back to:

`https://exambuilder-efae14d59f03.herokuapp.com`

The app integrates with backend endpoints for:

- Authentication and token refresh
- Registration and logout
- Password reset and email verification
- Topic, subtopic, and subcategory retrieval
- Question generation
- Answer marking
- Question-session submission
- User session history and performance summaries
- Billing checkout-session creation
- Performance-tracking reset

## Project Structure

```text
exambuilderfe/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── context/
│   ├── lib/
│   ├── pages/
│   ├── styles/
│   ├── App.jsx
│   └── main.jsx
├── eslint.config.js
├── index.html
├── package.json
└── vite.config.js
```

### Notable Directories

- `src/pages/`: top-level route views such as Home, Account, Progress, and QuestionGenerator.
- `src/components/`: shared UI such as the navigation bar, results history, route guards, and legal layouts.
- `src/context/`: authentication and user-access context.
- `src/lib/`: API client, access-control helpers, theme handling, and performance utilities.
- `src/styles/`: page-level and component-level stylesheet files.

## Local Development

### Prerequisites

- Node.js 18+ recommended
- npm

### Installation

Clone the repository and install dependencies:

```bash
npm install
```

### Environment Variables

Create a `.env` file if you need to override the default API URL:

```bash
VITE_API_BASE_URL=https://your-api-base-url
```

### Run the Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview the Production Build

```bash
npm run preview
```

### Run Linting

```bash
npm run lint
```

## Access Model

The frontend supports a qualification-based access model rather than a single all-or-nothing premium tier.

- Free users can sign up, explore the product, and generate a limited amount of locked-qualification practice.
- Paid access can unlock GCSE, A-Level, or both depending on the purchased plan.
- The account page shows the current plan label, email verification state, and remaining free daily quota where relevant.
- Locked analytics and generation limits are surfaced with upgrade prompts instead of silent failure.

## Design Notes

The current frontend uses a more modern product-marketing style than a traditional school portal. Key UI characteristics include:

- Promotional landing page with product preview panels.
- Responsive navigation with separate desktop and mobile treatments.
- Qualification cards and guided selection states in the generator.
- Theme preference support with light and dark mode switching.
- Chart-heavy progress views for premium study insights.

## Current Strengths

- Clear route separation between public, guest-only, and protected areas.
- Qualification-aware study flow rather than generic content selection.
- Strong account and recovery plumbing for a small frontend codebase.
- Meaningful progress reporting using saved session data.
- Legal, billing, and entitlement pages included in the product surface.

## Areas for Future Expansion

- Wider subject coverage beyond science.
- Broader specification coverage where the backend supports it.
- Additional analytics views and revision recommendations.
- More refined session resume and revision-planning workflows.
- Expanded testing coverage if automated frontend tests are introduced.

## Scripts

Available npm scripts:

- `npm run dev` starts the Vite development server.
- `npm run build` creates a production build.
- `npm run preview` serves the production build locally.
- `npm run lint` runs ESLint across the project.

## Notes

- This repository currently exposes linting scripts but no dedicated frontend test runner in `package.json`.
- The frontend depends on a compatible backend API for authentication, question generation, marking, billing, and progress data.