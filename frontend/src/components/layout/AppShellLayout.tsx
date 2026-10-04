import React from 'react';
import {
  AppShell,
  Burger,
  Group,
  Title,
  Badge,
  Button,
  ActionIcon,
  NavLink,
  Box,
  Text,
  Stack,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLayoutDashboard,
  IconReceipt,
  IconChartPie,
  IconUsers,
  IconLogout,
} from '@tabler/icons-react';
import { useAuthStore } from '../../store/authStore';
import { ThemeToggle } from '../common/ThemeToggle';

export type ActiveTab = 'dashboard' | 'transactions' | 'analytics' | 'household';

interface AppShellLayoutProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  children: React.ReactNode;
}

export const AppShellLayout: React.FC<AppShellLayoutProps> = ({
  activeTab,
  onSelectTab,
  children,
}) => {
  const [opened, { toggle, close }] = useDisclosure();
  const { user, isAdmin, logout } = useAuthStore();

  const handleNavClick = (tab: ActiveTab) => {
    onSelectTab(tab);
    close();
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 240,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3} size="h3" fw={800} c="emerald.7">
              FinMan
            </Title>
          </Group>

          <Group gap="sm">
            <Box ta="right" visibleFrom="sm">
              <Text size="sm" fw={600} lh={1.2}>
                {user?.name}
              </Text>
              <Badge
                size="xs"
                color={isAdmin ? 'emerald' : 'blue'}
                variant="light"
              >
                {isAdmin ? 'Admin' : 'Member'}
              </Badge>
            </Box>

            <ThemeToggle />

            {/* Desktop Sign Out Button */}
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<IconLogout size={16} />}
              onClick={logout}
              visibleFrom="sm"
            >
              Sign Out
            </Button>

            {/* Mobile Sign Out Icon */}
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={logout}
              hiddenFrom="sm"
              aria-label="Sign Out"
            >
              <IconLogout size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack justify="space-between" h="100%">
          <Box>
            {/* User profile on mobile inside drawer */}
            <Box
              hiddenFrom="sm"
              mb="md"
              pb="sm"
              style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
            >
              <Text size="sm" fw={700}>
                {user?.name}
              </Text>
              <Group gap="xs" mt={2}>
                <Badge size="xs" color={isAdmin ? 'emerald' : 'blue'} variant="light">
                  {isAdmin ? 'Admin' : 'Member'}
                </Badge>
                <Text size="xs" c="dimmed">
                  {user?.phone_number}
                </Text>
              </Group>
            </Box>

            <NavLink
              label="Dashboard"
              leftSection={<IconLayoutDashboard size={18} />}
              active={activeTab === 'dashboard'}
              color="emerald"
              onClick={() => handleNavClick('dashboard')}
              mb={4}
            />
            <NavLink
              label="Transactions"
              leftSection={<IconReceipt size={18} />}
              active={activeTab === 'transactions'}
              color="emerald"
              onClick={() => handleNavClick('transactions')}
              mb={4}
            />
            <NavLink
              label="Analytics"
              leftSection={<IconChartPie size={18} />}
              active={activeTab === 'analytics'}
              color="emerald"
              onClick={() => handleNavClick('analytics')}
              mb={4}
            />
            {isAdmin && (
              <NavLink
                label="Family"
                leftSection={<IconUsers size={18} />}
                active={activeTab === 'household'}
                color="emerald"
                onClick={() => handleNavClick('household')}
                mb={4}
              />
            )}
          </Box>

          {/* Drawer bottom sign out on mobile */}
          <Box hiddenFrom="sm" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            <Button
              fullWidth
              variant="light"
              color="red"
              leftSection={<IconLogout size={16} />}
              onClick={logout}
            >
              Sign Out
            </Button>
          </Box>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
};
