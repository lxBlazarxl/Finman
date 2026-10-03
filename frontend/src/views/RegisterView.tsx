import React, { useState } from 'react';
import {
  Card,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Anchor,
  Alert,
  Center,
  Container,
  Box,
} from '@mantine/core';
import { IconHome, IconUser, IconPhone, IconLock, IconAlertCircle } from '@tabler/icons-react';
import { authApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { ThemeToggle } from '../components/common/ThemeToggle';

interface RegisterViewProps {
  onNavigateToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onNavigateToLogin }) => {
  const [householdName, setHouseholdName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName || !adminName || !phoneNumber || !password) {
      setError('Please complete all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await authApi.registerHousehold({
        household_name: householdName.trim(),
        admin_name: adminName.trim(),
        phone_number: phoneNumber.trim(),
        password,
      });
      setAuth(data.access_token, data.user);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to initialize family');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}>
        <ThemeToggle />
      </Box>

      <Container size={440} my={50}>

      <Center mb={20}>
        <Stack align="center" gap={2}>
          <Title order={1} size="h2" fw={800} c="emerald.7">
            FinMan
          </Title>
          <Text c="dimmed" size="sm">
            Initial Family Setup
          </Text>
        </Stack>
      </Center>

      <Card withBorder shadow="sm" padding="xl" radius="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Title order={2} size="h4" ta="center">
              Setup Family Account
            </Title>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md">
                {error}
              </Alert>
            )}

            <TextInput
              label="Family Name"
              placeholder="e.g. Sharma Family"
              required
              leftSection={<IconHome size={16} />}
              value={householdName}
              onChange={(e) => setHouseholdName(e.currentTarget.value)}
            />

            <TextInput
              label="Administrator Name"
              placeholder="e.g. Rajesh Sharma"
              required
              leftSection={<IconUser size={16} />}
              value={adminName}
              onChange={(e) => setAdminName(e.currentTarget.value)}
            />

            <TextInput
              label="Phone Number"
              placeholder="e.g. 9876543210"
              required
              leftSection={<IconPhone size={16} />}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.currentTarget.value)}
            />

            <PasswordInput
              label="Password"
              placeholder="At least 6 characters"
              required
              leftSection={<IconLock size={16} />}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />

            <Button type="submit" fullWidth loading={loading} mt="xs">
              Complete Setup
            </Button>

            <Text c="dimmed" size="sm" ta="center" mt="xs">
              Already initialized?{' '}
              <Anchor component="button" type="button" size="sm" onClick={onNavigateToLogin}>
                Sign In
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Card>
    </Container>
  </>
);
};
