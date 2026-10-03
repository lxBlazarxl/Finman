import React, { useState } from 'react';
import {
  Card,
  Group,
  Stack,
  Text,
  Title,
  Button,
  SegmentedControl,
  Badge,
  Box,
} from '@mantine/core';
import { IconPlus, IconWallet, IconUsers } from '@tabler/icons-react';
import { formatINR } from '../../utils/currency';

interface PersonalBalanceCardProps {
  personalBalance: number;
  personalAccountsCount: number;
  householdTotalBalance?: number;
  householdMembers?: { user_id?: string; user_name: string; total_balance: number; accounts_count: number }[];
  isAdmin: boolean;
  onAddAccount: () => void;
}

export const PersonalBalanceCard: React.FC<PersonalBalanceCardProps> = ({
  personalBalance,
  personalAccountsCount,
  householdTotalBalance = 0,
  householdMembers = [],
  isAdmin,
  onAddAccount,
}) => {
  const [scope, setScope] = useState<'personal' | 'family'>('personal');

  const activeBalance = scope === 'personal' ? personalBalance : householdTotalBalance;
  const isNegative = activeBalance < 0;

  return (
    <Card withBorder shadow="xs" radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="xs">
            {scope === 'personal' ? (
              <IconWallet size={20} color="var(--mantine-color-emerald-6)" />
            ) : (
              <IconUsers size={20} color="var(--mantine-color-blue-6)" />
            )}
            <Text size="sm" c="dimmed" fw={600} tt="uppercase">
              {scope === 'personal' ? 'Personal Net Balance' : 'Family Liquidity Pool'}
            </Text>
          </Group>

          <Group gap="xs">
            {isAdmin && (
              <SegmentedControl
                size="xs"
                data={[
                  { label: 'My Balance', value: 'personal' },
                  { label: 'Family Pool', value: 'family' },
                ]}
                value={scope}
                onChange={(val) => setScope(val as 'personal' | 'family')}
              />
            )}

            <Button
              size="xs"
              variant="light"
              color="emerald"
              leftSection={<IconPlus size={14} />}
              onClick={onAddAccount}
            >
              Add Account
            </Button>
          </Group>
        </Group>

        <Box>
          <Title
            order={1}
            size="h1"
            fw={800}
            c={isNegative ? 'red.6' : undefined}
            lh={1.1}
          >
            {formatINR(activeBalance)}
          </Title>

          {scope === 'personal' ? (
            <Text size="xs" c="dimmed" mt={4}>
              Across {personalAccountsCount} account{personalAccountsCount === 1 ? '' : 's'}
            </Text>
          ) : (
            <Text size="xs" c="dimmed" mt={4}>
              Combined liquid pool across {householdMembers.length} family member{householdMembers.length === 1 ? '' : 's'}
            </Text>
          )}
        </Box>

        {scope === 'family' && householdMembers.length > 0 && (
          <Group gap="xs" mt="xs" pt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            <Text size="xs" c="dimmed" fw={600}>
              Member Breakdown:
            </Text>
            {householdMembers.map((m) => (
              <Badge key={m.user_name} variant="outline" color="gray" size="sm">
                {m.user_name}: {formatINR(m.total_balance)}
              </Badge>
            ))}
          </Group>
        )}
      </Stack>
    </Card>
  );
};
