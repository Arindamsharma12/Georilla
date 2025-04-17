import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ADMIN_IDS = [
  // Add your Clerk admin user IDs here
  'admin_clerk_id_1',
  'admin_clerk_id_2',
];

const stats = [
  { label: 'Today', value: '2nd August 2023', button: 'Advanced Configuration' },
  { label: 'Total Employees', value: '452', link: 'empolyee.html' },
  { label: 'On Time', value: '360', sub: '+30 from yesterday', link: 'ontime.html' },
  { label: 'Absent', value: '30', sub: '-5 from yesterday', link: 'absent.html' },
  { label: 'Late Arrival', value: '62' },
  { label: 'Early Departures', value: '6' },
  { label: 'Time-off', value: '42', sub: '+12 from yesterday' },
];

const attendanceLineData = {
  labels: ['01 Aug', '02 Aug', '03 Aug', '04 Aug', '05 Aug', '06 Aug', '07 Aug'],
  datasets: [
    {
      label: 'Attendance',
      data: [75, 60, 80, 70, 85, 50, 90],
      borderColor: '#4f46e5',
      backgroundColor: 'rgba(79, 70, 229, 0.2)',
      fill: true,
      tension: 0.3,
    },
  ],
};

const attendanceBarData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    {
      label: 'Attendance %',
      data: [90, 85, 88, 80, 95, 70, 60],
      backgroundColor: '#4f46e5',
    },
  ],
};

const tableRows = [
  { id: '001', name: 'John Doe', role: 'Engineer', dept: 'Development', status: 'On Time', statusColor: 'text-green-400' },
  { id: '002', name: 'Jane Smith', role: 'Designer', dept: 'UI/UX', status: 'Absent', statusColor: 'text-red-400' },
];

const AdminDashboard: React.FC = () => {
  // Remove Clerk admin check for now

  return (
    <div className="flex bg-[#0f0f10] min-h-screen w-full">
      {/* Sidebar */}
      <aside className="w-20 bg-gray-900 h-screen fixed top-0 left-0 flex flex-col justify-between items-center py-6 z-40">
        <div className="flex flex-col gap-6 items-center">
          <div className="w-6 h-6 bg-gray-700 rounded-full cursor-pointer"></div>
          <div className="w-6 h-6 bg-gray-700 rounded-full cursor-pointer"></div>
          <div className="w-6 h-6 bg-gray-700 rounded-full cursor-pointer"></div>
        </div>
        <div className="w-6 h-6 bg-gray-700 rounded-full cursor-pointer mb-4"></div>
      </aside>

      {/* Top Navigation Bar */}
      <nav className="w-full h-16 bg-gradient-to-r from-gray-900 to-gray-800 flex items-center justify-between px-6 fixed top-0 left-20 z-50">
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="Logo" className="h-6" />
          <span className="text-white font-semibold text-lg">Georilla</span>
        </div>
        <div className="flex space-x-4 text-sm font-medium items-center overflow-x-auto whitespace-nowrap">
          <a href="#" className="text-yellow-400 hover:text-yellow-500">Home</a>
          <a href="#" className="text-white hover:text-gray-300">Profile</a>
          <a href="#" className="text-white hover:text-gray-300">Sign up</a>
          <a href="signin.html" className="text-white hover:text-gray-300">Sign in</a>
          <a href="/admin" className="text-white hover:text-yellow-400 font-bold border border-yellow-400 px-3 py-1 rounded transition">Admin</a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 ml-20 pt-20 p-6">
        <header className="text-center mb-10"></header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8 text-sm">
          {stats.map((stat, idx) => (
            stat.link ? (
              <a key={idx} href={stat.link} className="card text-center hover:ring hover:ring-blue-500 transition-all">
                <p>{stat.label}</p>
                <h3 className="text-xl font-bold">{stat.value}</h3>
                {stat.sub && <p className="text-xs text-gray-400">{stat.sub}</p>}
              </a>
            ) : (
              <div key={idx} className="card col-span-1 text-center">
                <p className="text-xs">{stat.label}</p>
                <h2 className="text-lg font-bold">{stat.value}</h2>
                {stat.button && <button className="mt-4 px-4 py-1 bg-blue-600 text-xs rounded-lg">{stat.button}</button>}
                {stat.sub && <p className="text-xs text-gray-400">{stat.sub}</p>}
              </div>
            )
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold">Attendance Comparison Chart</h4>
              <div className="space-x-2 text-xs">
                <button className="text-gray-400 hover:text-white">Daily</button>
                <button className="text-gray-400 hover:text-white">Weekly</button>
                <button className="text-gray-400 hover:text-white">Monthly</button>
              </div>
            </div>
            <Line data={attendanceLineData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} height={150} />
          </div>
          <div className="card">
            <h4 className="text-sm font-semibold mb-2">Weekly Attendance</h4>
            <Bar data={attendanceBarData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} height={150} />
          </div>
        </div>

        {/* Table */}
        <div className="card text-sm">
          <h4 className="text-sm font-semibold mb-4">Attendance Overview</h4>
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <input type="text" placeholder="Search..." className="p-2 text-xs bg-gray-800 rounded w-full md:w-1/3" />
            <input type="date" className="p-2 text-xs bg-gray-800 rounded w-full md:w-auto" />
            <button className="px-4 py-1 text-xs bg-blue-600 rounded">Advanced Filters</button>
          </div>
          <table className="w-full table-auto text-left text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-2">ID</th>
                <th className="p-2">Employee</th>
                <th className="p-2">Role</th>
                <th className="p-2">Department</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-800">
                  <td className="p-2">{row.id}</td>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.role}</td>
                  <td className="p-2">{row.dept}</td>
                  <td className={`p-2 ${row.statusColor}`}>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <style jsx>{`
        .card {
          background-color: #1f1f22;
          border-radius: 1rem;
          padding: 1.5rem;
          margin: 0.5rem 0;
        }
        @media (min-width: 768px) {
          .card {
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard; 