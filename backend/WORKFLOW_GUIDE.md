# How to Add Steps to the Workflow

The Scanner project uses a dynamic workflow engine based on **XState** and **JSON configuration**. You can add or modify workflow steps without changing core backend logic.

## 1. Edit the Workflow Configuration

Open `backend/src/workflows/workflow.json`. This file defines the states (steps) and transitions.

### Example: Adding a "Regional Manager" Approval

Suppose you want to add a `regional_approved` step between `entered` and `project_approved`.

1.  **Locate the `entered` state**:
    Change its `APPROVE` target from `project_approved` to your new state `regional_approved`.

    ```json
    "entered": {
      "on": {
        "APPROVE": {
          "target": "regional_verified",  <-- Changed target
          "guard": {
            "type": "checkRole",
            "params": {
              "role": "regional_manager"
            }
          }
        },
        "REJECT": { ... }
      }
    }
    ```

2.  **Define the new `regional_verified` state**:
    Add a new key in the `states` object.

    ```json
    "regional_verified": {
      "on": {
        "APPROVE": {
          "target": "project_approved",   <-- Points to next step
          "guard": {
            "type": "checkRole",
            "params": {
              "role": "regional_manager"  <-- Required role
            }
          }
        },
        "REJECT": {
          "target": "rejected",
          "guard": "canReject"
        }
      }
    }
    ```

## 2. Backend Logic (Automatic)

The backend code is **already dynamic** and handles the following automatically:
-   **Status Updates**: The `ScanEntry` status will update to `regional_verified`.
-   **Approval Recording**: When `regional_manager` approves, the system automatically detects the role from the status name (e.g., `regional_verified` -> `regional`) and saves the approval in the `approvals` map (e.g., `approvals.regional`).
-   **Permissions**: The `getPendingEntries` API automatically checks `workflow.json` to see if the logged-in user (e.g., `regional_manager`) is allowed to approve the current state.

## 3. Frontend Updates

### Admin Panel (`admin/src/pages/Dashboard.jsx`)
The Admin Dashboard is built to be generic:
-   **Status Column**: It displays the raw status string (e.g., "Regional Verified") automatically.
-   **Actions**: The "Approve" button appears automatically if the backend says the user can approve.
-   **Color Badges**: New statuses will show as a default **Blue** badge. If you want a specific color (e.g., Purple), edit `getStatusBadge` in `Dashboard.jsx`.

### Mobile App
The mobile app's service layer (`ScanService.ts`) is dynamic. If you have a screen showing status, it will display the new string text automatically.

## 4. Testing
1.  Restart the backend server to load the new `workflow.json`.
2.  Login as the previous role (e.g., `center_manager`) and approve an entry.
3.  The entry status should now be `regional_verified`.
4.  Login as the new role (`regional_manager`) and verify you can see and approve the entry.
