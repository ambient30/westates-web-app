import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { hasPermission } from '../utils/permissions';
import JobsList from './JobsList';
import EmployeesList from './EmployeesList';
import ContractorsList from './ContractorsList';
import RoleManager from './RoleManager';
import UserManager from './UserManager';
import AvailabilityView from './AvailabilityView';
import PinksView from './PinksView';
import RatesManager from './RatesManager';



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
        <div className="dashboard-tabs">
  {hasPermission(permissions, 'jobs', 'read') && (
    <button
      className={activeTab === 'jobs' ? 'tab-active' : ''}
      onClick={() => setActiveTab('jobs')}
    >
      Jobs
    </button>
  )}
  {hasPermission(permissions, 'employees', 'read') && (
    <button
      className={activeTab === 'employees' ? 'tab-active' : ''}
      onClick={() => setActiveTab('employees')}
    >
      Employees
    </button>
  )}
  {hasPermission(permissions, 'contractors', 'read') && (
    <button
      className={activeTab === 'contractors' ? 'tab-active' : ''}
      onClick={() => setActiveTab('contractors')}
    >
      Contractors
    </button>
  )}
  <button
    className={activeTab === 'availability' ? 'tab-active' : ''}
    onClick={() => setActiveTab('availability')}
  >
    Availability
  </button>
  {hasPermission(permissions, 'users', 'read') && (
    <button
      className={activeTab === 'users' ? 'tab-active' : ''}
      onClick={() => setActiveTab('users')}
    >
      Users
    </button>
  )}
  {hasPermission(permissions, 'roles', 'read') && (
    <button
      className={activeTab === 'roles' ? 'tab-active' : ''}
      onClick={() => setActiveTab('roles')}
    >
      Roles
    </button>
  )}
  {hasPermission(permissions, 'roles', 'read') && (
  <button
  className={activeTab === 'pinks' ? 'tab-active' : ''}
  onClick={() => setActiveTab('pinks')}
>
  Pinks
</button>
)}
{hasPermission(permissions, 'rates', 'read') && (
  <button
    className={activeTab === 'rates' ? 'tab-active' : ''}
    onClick={() => setActiveTab('rates')}
  >
    Rates
  </button>
)}
</div>
      </nav>

      <main className="dashboard-main">
  {activeTab === 'jobs' && hasPermission(permissions, 'jobs', 'read') && (
    <JobsList permissions={permissions} />
  )}
  {activeTab === 'employees' && hasPermission(permissions, 'employees', 'read') && (
    <EmployeesList permissions={permissions} />
  )}
  {activeTab === 'contractors' && hasPermission(permissions, 'contractors', 'read') && (
    <ContractorsList permissions={permissions} />
  )}
  {activeTab === 'availability' && (
    <AvailabilityView permissions={permissions} />
  )}
  {activeTab === 'users' && hasPermission(permissions, 'users', 'read') && (
    <UserManager />
  )}
  {activeTab === 'roles' && hasPermission(permissions, 'roles', 'read') && (
    <RoleManager />
  )}
  {activeTab === 'pinks' && (
  <PinksView permissions={permissions} />
	)}
	{activeTab === 'rates' && hasPermission(permissions, 'rates', 'read') && (
  <RatesManager permissions={permissions} />
)}
</main>
    </div>
  );
}

export default Dashboard;