import React, { useState } from 'react';
import {
  Stack,
  Card,
  Group,
  Title,
  Button,
  Select,
  SegmentedControl,
  Table,
  Badge,
  ActionIcon,
  Text,
  Center,
  Loader,
  Box,
  SimpleGrid,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconArrowUpRight,
  IconArrowDownLeft,
  IconFilterOff,
} from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { transactionsApi, accountsApi, householdApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import {
  CreateTransactionModal,
  EditTransactionModal,
} from '../components/transactions/TransactionModals';
import type { TransactionResponse, TransactionType } from '../types';
import { notifications } from '@mantine/notifications';

const PAGE_SIZE = 25;

export const TransactionsView: React.FC = () => {
  const { isAdmin } = useAuthStore();
  const queryClient = useQueryClient();

  // Filters state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);

  // Modals state
  const [createOpened, setCreateOpened] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionResponse | null>(null);

  // Queries
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAccounts,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: transactionsApi.getCategories,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['household', 'members'],
    queryFn: householdApi.getMembers,
    enabled: isAdmin,
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: [
      'transactions',
      selectedAccountId,
      selectedCategory,
      selectedType,
      targetUserId,
      page,
    ],
    queryFn: () =>
      transactionsApi.getTransactions({
        account_id: selectedAccountId || undefined,
        category: selectedCategory || undefined,
        type: selectedType === 'ALL' ? undefined : (selectedType as TransactionType),
        target_user_id: targetUserId || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['balances'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  const handleDelete = async (tx: TransactionResponse) => {
    if (!confirm(`Delete ${tx.category} transaction for ₹${tx.amount}? Balance will be reverted.`)) {
      return;
    }
    try {
      await transactionsApi.deleteTransaction(tx.id);
      notifications.show({
        title: 'Transaction Deleted',
        message: 'Transaction removed and account balance reverted',
        color: 'gray',
      });
      handleRefresh();
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Could not delete transaction',
        color: 'red',
      });
    }
  };

  const handleClearFilters = () => {
    setSelectedAccountId(null);
    setSelectedCategory(null);
    setSelectedType('ALL');
    setTargetUserId(null);
    setPage(0);
  };

  const getAccountName = (accId: string) => {
    const acc = accounts.find((a) => a.id === accId);
    return acc ? acc.name : 'Account';
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={2} size="h3">
          Transactions
        </Title>

        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateOpened(true)}
        >
          Add Transaction
        </Button>
      </Group>

      {/* Filters Bar */}
      <Card withBorder shadow="xs" radius="md" p="md">
        <Stack gap="sm">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
            <Select
              label="Account"
              placeholder="All Accounts"
              clearable
              data={accounts.map((a) => ({ value: a.id, label: a.name }))}
              value={selectedAccountId}
              onChange={(val) => {
                setSelectedAccountId(val);
                setPage(0);
              }}
            />

            <Select
              label="Category"
              placeholder="All Categories"
              clearable
              searchable
              data={categories.map((c) => ({ value: c, label: c }))}
              value={selectedCategory}
              onChange={(val) => {
                setSelectedCategory(val);
                setPage(0);
              }}
            />

            {isAdmin && (
              <Select
                label="Household Member"
                placeholder="All Members"
                clearable
                data={members.map((m) => ({ value: m.id, label: m.name }))}
                value={targetUserId}
                onChange={(val) => {
                  setTargetUserId(val);
                  setPage(0);
                }}
              />
            )}

            <div>
              <Text size="sm" fw={500} mb={4}>
                Type
              </Text>
              <SegmentedControl
                fullWidth
                data={[
                  { label: 'All', value: 'ALL' },
                  { label: 'Expense', value: 'EXPENSE' },
                  { label: 'Income', value: 'INCOME' },
                ]}
                value={selectedType}
                onChange={(val) => {
                  setSelectedType(val);
                  setPage(0);
                }}
              />
            </div>
          </SimpleGrid>

          {(selectedAccountId || selectedCategory || selectedType !== 'ALL' || targetUserId) && (
            <Group justify="flex-end">
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<IconFilterOff size={14} />}
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            </Group>
          )}
        </Stack>
      </Card>

      {/* Transactions Table */}
      <Card withBorder shadow="xs" radius="md" p="md">
        {txLoading ? (
          <Center h={200}>
            <Loader size="md" />
          </Center>
        ) : transactions.length === 0 ? (
          <Center h={150}>
            <Text c="dimmed">No transactions match the selected filters.</Text>
          </Center>
        ) : (
          <>
            {/* Mobile Card List View */}
            <Box hiddenFrom="sm">
              <Stack gap="xs">
                {transactions.map((tx) => {
                  const isExpense = tx.type === 'EXPENSE';
                  return (
                    <Card key={tx.id} withBorder p="sm" radius="md">
                      <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="xs" mb={4}>
                            <Text fw={600} size="sm" truncate>
                              {tx.category}
                            </Text>
                            <Badge
                              size="xs"
                              variant="light"
                              color={isExpense ? 'red' : 'green'}
                              leftSection={
                                isExpense ? (
                                  <IconArrowUpRight size={10} />
                                ) : (
                                  <IconArrowDownLeft size={10} />
                                )
                              }
                            >
                              {tx.type}
                            </Badge>
                          </Group>
                          {tx.description && (
                            <Text size="xs" c="dimmed" truncate mb={4}>
                              {tx.description}
                            </Text>
                          )}
                          <Group gap="xs">
                            <Badge size="xs" variant="outline" color="gray">
                              {getAccountName(tx.account_id)}
                            </Badge>
                            <Text size="xs" c="dimmed">
                              {formatDate(tx.date)}
                            </Text>
                          </Group>
                        </Box>

                        <Stack align="flex-end" gap={4} style={{ flexShrink: 0 }}>
                          <Text
                            fw={700}
                            size="sm"
                            c={isExpense ? 'red.6' : 'green.7'}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            {isExpense ? '-' : '+'}
                            {formatINR(tx.amount)}
                          </Text>
                          <Group gap={4}>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              onClick={() => setEditingTransaction(tx)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => handleDelete(tx)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Stack>
                      </Group>
                    </Card>
                  );
                })}
              </Stack>
            </Box>

            {/* Desktop Structured Table View */}
            <Box visibleFrom="sm" style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Account</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
                    <Table.Th style={{ textAlign: 'center', width: 90 }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {transactions.map((tx) => {
                    const isExpense = tx.type === 'EXPENSE';
                    return (
                      <Table.Tr key={tx.id}>
                        <Table.Td style={{ whiteSpace: 'nowrap' }}>
                          <Text size="sm">{formatDate(tx.date)}</Text>
                        </Table.Td>
                        <Table.Td fw={500}>{tx.category}</Table.Td>
                        <Table.Td c={tx.description ? undefined : 'dimmed'}>
                          {tx.description || '-'}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{getAccountName(tx.account_id)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={isExpense ? 'red' : 'green'}
                            variant="light"
                            size="sm"
                            leftSection={
                              isExpense ? (
                                <IconArrowUpRight size={12} />
                              ) : (
                                <IconArrowDownLeft size={12} />
                              )
                            }
                          >
                            {tx.type}
                          </Badge>
                        </Table.Td>
                        <Table.Td
                          style={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                          fw={700}
                          c={isExpense ? 'red.6' : 'green.7'}
                        >
                          {isExpense ? '-' : '+'}
                          {formatINR(tx.amount)}
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} justify="center">
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              onClick={() => setEditingTransaction(tx)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => handleDelete(tx)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Box>
          </>
        )}

        {/* Pagination Bar */}
        <Group justify="space-between" mt="md" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
          <Text size="xs" c="dimmed">
            Page {page + 1} ({transactions.length} records shown)
          </Text>

          <Group gap="xs">
            <Button
              size="xs"
              variant="default"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="xs"
              variant="default"
              disabled={transactions.length < PAGE_SIZE}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </Group>
        </Group>
      </Card>

      <CreateTransactionModal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
        accounts={accounts}
        categories={categories}
        onTransactionCreated={handleRefresh}
      />

      <EditTransactionModal
        transaction={editingTransaction}
        opened={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        categories={categories}
        onTransactionUpdated={handleRefresh}
      />
    </Stack>
  );
};
