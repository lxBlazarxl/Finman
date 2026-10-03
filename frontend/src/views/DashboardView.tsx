import React, { useState } from 'react';
import { Stack, Title, Box, Loader, Center, Group, Button, Card, Text, ThemeIcon } from '@mantine/core';
import { IconArrowRight, IconArrowUpRight, IconArrowDownLeft } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { balancesApi, accountsApi, transactionsApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { PersonalBalanceCard } from '../components/dashboard/PersonalBalanceCard';
import { AccountsGrid } from '../components/dashboard/AccountsGrid';
import { AddAccountModal, EditAccountModal } from '../components/dashboard/AccountModals';
import { RapidSmsDock } from '../components/ingestion/RapidSmsDock';
import { SmsParseModal } from '../components/ingestion/SmsParseModal';
import { QuickDialsRow } from '../components/dashboard/QuickDialsRow';
import type { AccountResponse, SMSParseResult } from '../types';
import { notifications } from '@mantine/notifications';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';

interface DashboardViewProps {
  onNavigateToTransactions?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToTransactions }) => {
  const { isAdmin } = useAuthStore();
  const queryClient = useQueryClient();

  const [addModalOpened, setAddModalOpened] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountResponse | null>(null);

  // SMS Modal State
  const [parseResult, setParseResult] = useState<SMSParseResult | null>(null);
  const [rawSms, setRawSms] = useState<string>('');
  const [smsModalOpened, setSmsModalOpened] = useState(false);

  // Queries
  const { data: personalBalance, isLoading: personalLoading } = useQuery({
    queryKey: ['balances', 'me'],
    queryFn: balancesApi.getPersonalBalance,
  });

  const { data: householdBalance } = useQuery({
    queryKey: ['balances', 'household'],
    queryFn: balancesApi.getHouseholdBalance,
    enabled: isAdmin,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: transactionsApi.getCategories,
  });

  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => transactionsApi.getTransactions({ limit: 5 }),
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['balances'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  const handleSmsParsed = (result: SMSParseResult, rawText: string) => {
    setParseResult(result);
    setRawSms(rawText);
    setSmsModalOpened(true);
  };

  const handleDeleteAccount = async (account: AccountResponse) => {
    if (!confirm(`Delete account "${account.name}"? All associated transactions will be removed.`)) {
      return;
    }
    try {
      await accountsApi.deleteAccount(account.id);
      notifications.show({
        title: 'Account Deleted',
        message: `${account.name} was removed`,
        color: 'gray',
      });
      handleRefresh();
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Could not delete account',
        color: 'red',
      });
    }
  };

  if (personalLoading) {
    return (
      <Center h={300}>
        <Loader size="md" color="emerald" />
      </Center>
    );
  }

  const accounts = personalBalance?.accounts || [];
  const totalBalance = personalBalance?.total_balance ?? 0;

  const getAccountName = (accId: string) => {
    const acc = accounts.find((a) => a.id === accId);
    return acc ? acc.name : 'Account';
  };

  return (
    <Stack gap="lg">
      <Box>
        <PersonalBalanceCard
          personalBalance={totalBalance}
          personalAccountsCount={accounts.length}
          householdTotalBalance={householdBalance?.total_household_balance}
          householdMembers={householdBalance?.members || []}
          isAdmin={isAdmin}
          onAddAccount={() => setAddModalOpened(true)}
        />
      </Box>

      {/* Rapid Ingestion Dock */}
      <Box>
        <RapidSmsDock onParsed={handleSmsParsed} />
      </Box>

      {/* Cash Quick-Dials */}
      <Box>
        <QuickDialsRow
          accounts={accounts}
          categories={categories}
          onTransactionCreated={handleRefresh}
        />
      </Box>

      <Box>
        <Title order={3} size="h4" mb="sm">
          Accounts
        </Title>
        <AccountsGrid
          accounts={accounts}
          onEdit={(acc) => setEditingAccount(acc)}
          onDelete={handleDeleteAccount}
        />
      </Box>

      {/* Recent Activity */}
      <Box>
        <Group justify="space-between" align="center" mb="sm">
          <Title order={3} size="h4">
            Recent Activity
          </Title>
          {onNavigateToTransactions && (
            <Button
              variant="subtle"
              size="xs"
              color="emerald"
              rightSection={<IconArrowRight size={14} />}
              onClick={onNavigateToTransactions}
            >
              View All
            </Button>
          )}
        </Group>

        <Card withBorder shadow="xs" radius="md" p="md">
          {recentTransactions.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="md">
              No recent transactions recorded.
            </Text>
          ) : (
            <Stack gap="xs">
              {recentTransactions.map((tx) => {
                const isExpense = tx.type === 'EXPENSE';
                return (
                  <Group
                    key={tx.id}
                    justify="space-between"
                    align="center"
                    wrap="nowrap"
                    py={8}
                    style={{
                      borderBottom: '1px solid var(--mantine-color-default-border)',
                    }}
                  >
                    <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                      <ThemeIcon
                        size="md"
                        radius="xl"
                        variant="light"
                        color={isExpense ? 'red' : 'teal'}
                      >
                        {isExpense ? <IconArrowUpRight size={16} /> : <IconArrowDownLeft size={16} />}
                      </ThemeIcon>
                      <Box style={{ minWidth: 0, flex: 1 }}>
                        <Text fw={600} size="sm" truncate>
                          {tx.category}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {tx.description ? `${tx.description} • ` : ''}
                          {getAccountName(tx.account_id)} • {formatDate(tx.date)}
                        </Text>
                      </Box>
                    </Group>

                    <Text
                      fw={700}
                      size="sm"
                      c={isExpense ? 'red.6' : 'teal.7'}
                      style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      {isExpense ? '-' : '+'}
                      {formatINR(tx.amount)}
                    </Text>
                  </Group>
                );
              })}
            </Stack>
          )}
        </Card>
      </Box>

      {/* Modals */}
      <AddAccountModal
        opened={addModalOpened}
        onClose={() => setAddModalOpened(false)}
        onAccountCreated={handleRefresh}
      />

      <EditAccountModal
        account={editingAccount}
        opened={!!editingAccount}
        onClose={() => setEditingAccount(null)}
        onAccountUpdated={handleRefresh}
      />

      <SmsParseModal
        opened={smsModalOpened}
        onClose={() => setSmsModalOpened(false)}
        parseResult={parseResult}
        rawSms={rawSms}
        accounts={accounts}
        categories={categories}
        onTransactionCreated={handleRefresh}
      />
    </Stack>
  );
};
