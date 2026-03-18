import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { hasPermission } from '../utils/permissions';
import JobsList from './JobsList';
import EmployeesList from './EmployeesList';
import ContractorsList from './ContractorsList';
import RoleManager from './RoleManager';
import UserManager from './UserManager';

function Dashboard({ user, permissions }) {
  const [activeTab, setActiveTab] = useState('jobs');

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // Check what tabs user can see
  const canViewJobs = hasPermission(permissions, 'jobs', 'read');
  const canViewEmployees = hasPermission(permissions, 'employees', 'read');
  const canViewContractors = hasPermission(permissions, 'contractors', 'read');
  const canViewUsers = hasPermission(permissions, 'users', 'read');
  const canViewRoles = hasPermission(permissions, 'roles', 'read');

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-content">
          <h1>West States Job Manager</h1>
          <div className="user-info">
            <span className="user-email">{user.email}</span>
            <button onClick={handleSignOut} className="btn btn-secondary">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <nav className="nav">
        <div className="nav-content">
          {canViewJobs && (
            <button
              className={`nav-item ${activeTab === 'jobs' ? 'active' : ''}`}
              onClick={() => setActiveTab('jobs')}
            >
              Jobs
            </button>
          )}
          {canViewEmployees && (
            <button
              className={`nav-item ${activeTab === 'employees' ? 'active' : ''}`}
              onClick={() => setActiveTab('employees')}
            >
              Employees
            </button>
          )}
          {canViewContractors && (
            <button
              className={`nav-item ${activeTab === 'contractors' ? 'active' : ''}`}
              onClick={() => setActiveTab('contractors')}
            >
              Contractors
            </button>
          )}
          {canViewUsers && (
            <button
              className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users
            </button>
          )}
          {canViewRoles && (
            <button
              className={`nav-item ${activeTab === 'roles' ? 'active' : ''}`}
              onClick={() => setActiveTab('roles')}
            >
              Roles
            </button>
          )}
          <button
            className={`nav-item ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            Export
          </button>
        </div>
      </nav>

      <main className="main-content">
        {activeTab === 'jobs' && canViewJobs && (
          <JobsList permissions={permissions} />
        )}
        {activeTab === 'employees' && canViewEmployees && (
          <EmployeesList permissions={permissions} />
        )}
        {activeTab === 'contractors' && canViewContractors && (
          <ContractorsList permissions={permissions} />
        )}
        {activeTab === 'users' && canViewUsers && (
          <UserManager permissions={permissions} />
        )}
        {activeTab === 'roles' && canViewRoles && (
          <RoleManager permissions={permissions} />
        )}
        {activeTab === 'export' && (
          <div className="empty-state">
            <h3>Export Data</h3>
            <p>Coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;