import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Avatar, ConfigProvider, Layout as AntLayout, Menu, Space, Switch, Typography, theme as antdTheme, Button as AntButton } from 'antd';
import {
  DashboardOutlined,
  UploadOutlined,
  TeamOutlined,
  UserOutlined,
  ProjectOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  CheckSquareOutlined,
  BankOutlined,
  AppstoreOutlined,
  LogoutOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import compactLogo from '../assets/compact_logo.png';

const Layout = ({ children }) => {
  const { user, logout, themeMode, setThemeMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const siderTheme = themeMode === 'dark' ? 'dark' : 'light';
  const themeTokens = themeMode === 'dark'
    ? {
      colorBgLayout: '#0f1115',
      colorBgContainer: '#15181e',
      colorBorderSecondary: 'rgba(255,255,255,0.12)',
      colorText: 'rgba(255,255,255,0.88)',
      colorTextSecondary: 'rgba(255,255,255,0.65)',
    }
    : {
      colorBgLayout: '#f5f5f5',
      colorBgContainer: '#ffffff',
      colorBorderSecondary: 'rgba(0,0,0,0.08)',
      colorText: 'rgba(0,0,0,0.88)',
      colorTextSecondary: 'rgba(0,0,0,0.55)',
    };

  const siderBg = siderTheme === 'dark' ? '#101522' : themeTokens.colorBgContainer;
  const siderBorder = siderTheme === 'dark' ? 'rgba(255,255,255,0.08)' : themeTokens.colorBorderSecondary;

  const hasRole = (roles) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return roles.includes(user.role);
  };

  const title = (() => {
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname === '/staff') return 'Staff Management';
    if (location.pathname === '/users') return 'User Management';
    if (location.pathname === '/payroll') return 'Payroll';
    if (location.pathname === '/projects') return 'Projects';
    if (location.pathname === '/centers') return 'Centers';
    if (location.pathname === '/rates') return 'Rate Charts';
    if (location.pathname === '/activities') return 'Activities Master';
    if (location.pathname === '/approvals') return 'Approval Dashboard';
    if (location.pathname === '/upload') return 'Work Upload';
    return 'Admin Panel';
  })();

  const items = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  ];

  if (hasRole(['center_supervisor'])) {
    items.push({ key: '/upload', icon: <UploadOutlined />, label: 'Upload Work' });
    items.push({ key: '/staff', icon: <TeamOutlined />, label: 'Staff Management' });
  }

  if (hasRole([])) {
    items.push({ key: '/users', icon: <UserOutlined />, label: 'User Management' });
    items.push({ key: '/centers', icon: <ApartmentOutlined />, label: 'Centers' });
    items.push({ key: '/activities', icon: <AppstoreOutlined />, label: 'Activities' });
  }

  if (hasRole(['project_manager'])) {
    items.push({ key: '/projects', icon: <ProjectOutlined />, label: 'Projects' });
  }

  if (hasRole(['project_manager', 'finance_hr'])) {
    items.push({ key: '/rates', icon: <BarChartOutlined />, label: 'Rate Charts' });
    items.push({ key: '/approvals', icon: <CheckSquareOutlined />, label: 'Approvals' });
  }

  if (hasRole(['finance_hr', 'project_manager'])) {
    items.push({ key: '/payroll', icon: <BankOutlined />, label: 'Payroll' });
  }

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: themeMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          borderRadius: 10,
          ...themeTokens,
        },
      }}
    >
      <AntLayout style={{ height: '100vh' }}>
        <AntLayout.Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={260}
          theme={siderTheme}
          style={{ overflow: 'auto', background: siderBg, borderRight: `1px solid ${siderBorder}` }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, borderBottom: `1px solid ${siderBorder}` }}>
            <img src={compactLogo} alt="Scanner" style={{ width: collapsed ? 36 : 44, height: collapsed ? 36 : 44, objectFit: 'contain' }} />
          </div>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={items}
            onClick={({ key }) => navigate(key)}
            theme={siderTheme}
            style={{ background: siderBg }}
          />
          <div style={{ padding: 16, borderTop: `1px solid ${siderBorder}` }}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <Space size={8}>
                  <Avatar style={{ backgroundColor: '#1677ff' }}>{(user?.name || 'U').slice(0, 1).toUpperCase()}</Avatar>
                  {!collapsed && (
                    <div style={{ lineHeight: 1.2 }}>
                      <Typography.Text strong style={{ display: 'block' }}>{user?.name}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12, textTransform: 'capitalize' }}>
                        {user?.role?.replace('_', ' ')}
                      </Typography.Text>
                    </div>
                  )}
                </Space>
                <AntButton type="text" icon={<LogoutOutlined />} onClick={onLogout} />
              </Space>
              {!collapsed && (
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Space size={8}>
                    {themeMode === 'dark' ? <MoonOutlined /> : <SunOutlined />}
                    <Typography.Text type="secondary">Theme</Typography.Text>
                  </Space>
                  <Switch
                    checked={themeMode === 'dark'}
                    onChange={(checked) => setThemeMode(checked ? 'dark' : 'light')}
                  />
                </Space>
              )}
            </Space>
          </div>
        </AntLayout.Sider>

        <AntLayout>
          <AntLayout.Header style={{ background: themeTokens.colorBgContainer, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${themeTokens.colorBorderSecondary}` }}>
            <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
            <Space size={12}>
              <Switch
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
                checked={themeMode === 'dark'}
                onChange={(checked) => setThemeMode(checked ? 'dark' : 'light')}
              />
              <AntButton icon={<LogoutOutlined />} onClick={onLogout}>Logout</AntButton>
            </Space>
          </AntLayout.Header>
          <AntLayout.Content style={{ padding: 20, overflow: 'auto', background: themeTokens.colorBgLayout }}>
            {children}
          </AntLayout.Content>
        </AntLayout>
      </AntLayout>
    </ConfigProvider>
  );
};

export default Layout;
