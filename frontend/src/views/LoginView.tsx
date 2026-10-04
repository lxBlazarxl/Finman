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
import { IconPhone, IconLock, IconAlertCircle } from '@tabler/icons-react';
import { authApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { ThemeToggle } from '../components/common/ThemeToggle';

interface LoginViewProps {
  onNavigateToSetup?: () => void;
  showSetupLink?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ onNavigateToSetup, showSetupLink = false }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !password) {
      setError('Please provide phone number and password');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await authApi.login(phoneNumber.trim(), password);
      setAuth(data.access_token, data.user);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Invalid phone number or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}>
        <ThemeToggle />
      </Box>

      <Container size={420} my={60}>

      <Center mb={24}>
        <Stack align="center" gap={2}>
          <Title order={1} size="h2" fw={800} c="emerald.7">
            FinMan
          </Title>
          <Text c="dimmed" size="sm">
            Household Finance Manager
          </Text>
        </Stack>
      </Center>

      <Card withBorder shadow="sm" padding="xl" radius="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Title order={2} size="h4" ta="center">
              Sign In
            </Title>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md">
                {error}
              </Alert>
            )}

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
              placeholder="Your password"
              required
              leftSection={<IconLock size={16} />}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />

            <Button type="submit" fullWidth loading={loading} mt="xs">
              Sign In
            </Button>

            {showSetupLink && onNavigateToSetup && (
              <Text c="dimmed" size="sm" ta="center" mt="xs">
                First time setup?{' '}
                <Anchor component="button" type="button" size="sm" onClick={onNavigateToSetup}>
                  Set up Family & Admin
                </Anchor>
              </Text>
            )}
          </Stack>
        </form>
      </Card>
    </Container>
  </>
);
};
