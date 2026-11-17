# 📄 Go-Document System (Frontend)

Frontend web application for the **Go-Document Management & Workflow System**, built with **Angular 17**. This application provides an interactive interface for managing document numbering, proposed changes, authorization workflows, document handovers, multi-step approvals, and completion ratings.

## 🧱 Tech Stack

- **Framework**: Angular 17
- **State Management**: NgRx (`@ngrx/store`, `@ngrx/effects`)
- **UI & Styling**: Bootstrap 5, Ng-Bootstrap, Angular Material, SCSS
- **Data Visualization**: ApexCharts, ECharts, Chart.js
- **Rich Text & Utilities**: CKEditor 5, Flatpickr, SweetAlert2, Ngx-Mask, Ngx-Dropzone

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **npm** or **yarn**
- Running instance of **Go-Document Backend API**

### 2. Install Dependencies
```sh
npm install
```

### 3. Environment Configuration
Check and configure the API URL in `src/environments/`:

- **Development** (`src/environments/environment.ts`):
  ```typescript
  export const environment = {
    apiUrl: "http://localhost:7777/api",
    production: false,
    defaultauth: 'fakebackend',
    firebaseConfig: { ... }
  };
  ```
- **Production** (`src/environments/environment.prod.ts`):
  ```typescript
  export const environment = {
    apiUrl: "https://your-production-domain.com/api",
    production: true,
    defaultauth: 'fakebackend',
    firebaseConfig: { ... }
  };
  ```

### 4. Start Development Server
```sh
npm start
# or
ng serve
```
Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### 5. Build for Production
```sh
npm run build
```
The build artifacts will be stored in the `dist/velzon` directory.

## 📁 Key Modules

- **Dashboard**: Summary analytics, document statistics, department involvement, and top contributors (`src/app/pages/dashboards`)
- **Master Data**: Organization structure (Plant, Department, Section, Line, Area), Document Types & Categories, Support Documents, User Authorizations, and Approver Templates (`src/app/pages/master-data`)
- **Activity & Document Workflows** (`src/app/pages/activity-page`):
  1. **Document Numbers** (`01-document-numbers`)
  2. **Proposed Changes & Approvals** (`02-proposed-changes`, `02-approval-proposed-changes`)
  3. **Authorization Documents & Approvers** (`03-authorization-doc`, `03-authorization-doc-approver`)
  4. **Handover Documents & Approvers** (`04-handover-doc`, `04-handover-doc-approver`)
  5. **Completion & Rating** (`05-completion`)
