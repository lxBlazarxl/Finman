import React, { useState } from 'react';
import {
  Stack,
  Card,
  Group,
  Title,
  Text,
  Button,
  Table,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  PasswordInput,
  Box,
  Alert,
  Center,
  Loader,
} from '@mantine/core';
import {
  IconUserPlus,
  IconTrash,
  IconEdit,
  IconShield,
  IconAlertCircle,
  IconHome,
} from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { householdApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { formatDate } from '../utils/date';
import { notifications } from '@mantine/notifications';
import type { UserResponse } from '../types';

export const HouseholdView: React.FC = () => {
  const { user, household, isAdmin, setHousehold } = useAuthStore();
  const queryClient = useQueryClient();

  const [addMemberOpened, setAddMemberOpened] = useState(false);
  const [editHouseholdOpened, setEditHouseholdOpened] = useState(false);

  // Form states
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberAccountName, setNewMemberAccountName] = useState('Pocket Cash');
  const [newHouseholdName, setNewHouseholdName] = useState(household?.name || '');
  const [formLoading, setFormLoading] = useState(false);

  // Queries
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['household', 'members'],
    queryFn: householdApi.getMembers,
    enabled: isAdmin,
  });

  const { data: householdData } = useQuery({
    queryKey: ['household', 'details'],
    queryFn: householdApi.getHousehold,
    enabled: isAdmin,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['household'] });
    queryClient.invalidateQueries({ queryKey: ['balances'] });
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberPhone || !newMemberPassword) return;

    setFormLoading(true);
    try {
      await householdApi.createMember({
        name: newMemberName.trim(),
        phone_number: newMemberPhone.trim(),
        password: newMemberPassword,
        initial_account_name: newMemberAccountName.trim() || undefined,
      });

      notifications.show({
        title: 'Member Added',
        message: `${newMemberName} has been added to the household`,
        color: 'green',
      });

      setNewMemberName('');
      setNewMemberPhone('');
      setNewMemberPassword('');
      setAddMemberOpened(false);
      handleRefresh();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      notifications.show({
        title: 'Error',
        message: typeof detail === 'string' ? detail : 'Failed to add member',
        color: 'red',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteMember = async (member: UserResponse) => {
    if (!confirm(`Remove "${member.name}" from household? All their accounts and transactions will be deleted.`)) {
      return;
    }

    try {
      await householdApi.deleteMember(member.id);
      notifications.show({
        title: 'Member Removed',
        message: `${member.name} was removed from the household`,
        color: 'gray',
      });
      handleRefresh();
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Could not remove member',
        color: 'red',
      });
    }
  };

  const handleUpdateHouseholdName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseholdName.trim()) return;

    setFormLoading(true);
    try {
      const updated = await householdApi.updateHousehold({ name: newHouseholdName.trim() });
      setHousehold(updated);
      notifications.show({
        title: 'Household Updated',
        message: 'Household name updated successfully',
        color: 'green',
      });
      setEditHouseholdOpened(false);
      handleRefresh();
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to update household name',
        color: 'red',
      });
    } finally {
      setFormLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md">
        Access Restricted: Household administration is reserved for household administrators.
      </Alert>
    );
  }

  const activeHousehold = householdData || household;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={2} size="h3">
          Family Management
        </Title>

        <Button
          leftSection={<IconUserPlus size={16} />}
          onClick={() => setAddMemberOpened(true)}
        >
          Add Member
        </Button>
      </Group>

      {/* Household Overview Card */}
      <Card withBorder shadow="xs" radius="md" p="md">
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconHome size={28} color="gray" />
            <Box>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Family Name
              </Text>
              <Title order={3} size="h3">
                {activeHousehold?.name || 'My Family'}
              </Title>
            </Box>
          </Group>

          <Button
            size="xs"
            variant="light"
            leftSection={<IconEdit size={14} />}
            onClick={() => {
              setNewHouseholdName(activeHousehold?.name || '');
              setEditHouseholdOpened(true);
            }}
          >
            Edit Name
          </Button>
        </Group>
      </Card>

      {/* Members List */}
      <Card withBorder shadow="xs" radius="md" p="md">
        <Title order={3} size="h4" mb="md">
          Family Members ({members.length})
        </Title>

        {membersLoading ? (
          <Center h={150}>
            <Loader size="md" />
          </Center>
        ) : (
          <>
            {/* Mobile Member Cards */}
            <Box hiddenFrom="sm">
              <Stack gap="xs">
                {members.map((m) => {
                  const isSelf = m.id === user?.id;
                  return (
                    <Card key={m.id} withBorder p="sm" radius="md">
                      <Group justify="space-between" align="center">
                        <Box>
                          <Group gap="xs" mb={4}>
                            <Text fw={600} size="sm">
                              {m.name}
                            </Text>
                            {isSelf && (
                              <Badge size="xs" variant="outline" color="gray">
                                You
                              </Badge>
                            )}
                            <Badge
                              color={m.role === 'ADMIN' ? 'violet' : 'blue'}
                              variant="light"
                              size="xs"
                              leftSection={m.role === 'ADMIN' ? <IconShield size={10} /> : undefined}
                            >
                              {m.role}
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed">
                            {m.phone_number} • Joined {formatDate(m.created_at)}
                          </Text>
                        </Box>

                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          disabled={isSelf}
                          title={isSelf ? 'Cannot remove yourself' : 'Remove member'}
                          onClick={() => handleDeleteMember(m)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Card>
                  );
                })}
              </Stack>
            </Box>

            {/* Desktop Structured Table */}
            <Box visibleFrom="sm" style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Phone Number</Table.Th>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Joined Date</Table.Th>
                    <Table.Th style={{ textAlign: 'center', width: 80 }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {members.map((m) => {
                    const isSelf = m.id === user?.id;
                    return (
                      <Table.Tr key={m.id}>
                        <Table.Td fw={600}>
                          <Group gap="xs">
                            {m.name}
                            {isSelf && (
                              <Badge size="xs" variant="outline" color="gray">
                                You
                              </Badge>
                            )}
                          </Group>
                        </Table.Td>
                        <Table.Td>{m.phone_number}</Table.Td>
                        <Table.Td>
                          <Badge
                            color={m.role === 'ADMIN' ? 'violet' : 'blue'}
                            variant="light"
                            leftSection={m.role === 'ADMIN' ? <IconShield size={12} /> : undefined}
                          >
                            {m.role}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{formatDate(m.created_at)}</Table.Td>
                        <Table.Td>
                          <Center>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              disabled={isSelf}
                              title={isSelf ? 'Cannot remove yourself' : 'Remove member'}
                              onClick={() => handleDeleteMember(m)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Center>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Box>
          </>
        )}
      </Card>

      {/* Add Member Modal */}
      <Modal
        opened={addMemberOpened}
        onClose={() => setAddMemberOpened(false)}
        title="Add New Member"
        centered
      >
        <form onSubmit={handleCreateMember}>
          <Stack gap="md">
            <TextInput
              label="Full Name"
              placeholder="e.g. Pooja Sharma, Aarav Sharma"
              required
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.currentTarget.value)}
            />

            <TextInput
              label="Phone Number"
              placeholder="10-digit phone number"
              required
              value={newMemberPhone}
              onChange={(e) => setNewMemberPhone(e.currentTarget.value)}
            />

            <PasswordInput
              label="Initial Password"
              placeholder="At least 6 characters"
              required
              value={newMemberPassword}
              onChange={(e) => setNewMemberPassword(e.currentTarget.value)}
            />

            <TextInput
              label="Initial Cash Account Name"
              placeholder="e.g. Pocket Cash, Allowance"
              value={newMemberAccountName}
              onChange={(e) => setNewMemberAccountName(e.currentTarget.value)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setAddMemberOpened(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={formLoading}>
                Add Member
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Edit Family Name Modal */}
      <Modal
        opened={editHouseholdOpened}
        onClose={() => setEditHouseholdOpened(false)}
        title="Edit Family Name"
        centered
      >
        <form onSubmit={handleUpdateHouseholdName}>
          <Stack gap="md">
            <TextInput
              label="Family Name"
              required
              value={newHouseholdName}
              onChange={(e) => setNewHouseholdName(e.currentTarget.value)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setEditHouseholdOpened(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={formLoading}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};
