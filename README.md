# Aerostaff - Staff Management System

A comprehensive staff scheduling, training, and availability management tool designed for aviation personnel planning.

## Features

- **Staff Management**: detailed employee profiles including roles (SrEng, PM, etc.), departments, and contact info.
- **Calendar & Scheduling**: Visual monthly schedule with shift codes (Day, Late, Night, Training, etc.).
- **Training Tracker**: Track employee training sessions, expirations, and availability.
- **Availability Logic**: Automated checks for minimum staffing (Senior Staff presence) and conflicts (Vacation, Sick, etc.).
- **Dashboard**: High-level overview of daily staffing, man-hours, and skill distribution.
- **Data Export**: Export monthly schedules to Excel.

## Tech Stack

- **Frontend**: React, Vite, Shadcn UI, TailwindCSS, Recharts, Lucide Icons.
- **Data**: Local Storage (Offline capabilities) & Mock Data for demonstration.
- **Utilities**: `date-fns` for robust date handling, `xlsx` for Excel export.

## Setup

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run Development Server:**
    ```bash
    npm run dev
    ```

## Deployment (GitHub Pages)

This project is configured for easy deployment to GitHub Pages.

1.  Push the code to your GitHub repository.
2.  Go to **Settings** -> **Pages**.
3.  Select **Source** as **GitHub Actions**.
4.  The workflow in `.github/workflows/deploy.yml` will build and deploy the site automatically.
