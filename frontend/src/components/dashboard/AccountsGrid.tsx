import React from 'react';
import {
  SimpleGrid,
  Card,
  Group,
  Text,
  Badge,
  ActionIcon,
  Menu,
  Box,
} from '@mantine/core';
import {
  IconBuildingBank,
  IconCash,
  IconCreditCard,
  IconDotsVertical,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';
import type { AccountResponse, AccountType } from '../../types';
import { formatINR } from '../../utils/currency';

interface AccountsGridProps {
  accounts: AccountResponse[];
  onEdit: (account: AccountResponse) => void;
  onDelete: (account: AccountResponse) => void;
}

const getAccountIcon = (type: AccountType) => {
  switch (type) {
    case 'BANK':
      return <IconBuildingBank size={14} />;
    case 'CASH':
      return <IconCash size={14} />;
    case 'CREDIT_CARD':
      return <IconCreditCard size={14} />;
    default:
      return <IconBuildingBank size={14} />;
  }
};

const getAccountBadge = (type: AccountType) => {
  switch (type) {
    case 'BANK':
      return { label: 'Bank Account', color: 'blue' };
    case 'CASH':
      return { label: 'Physical Cash', color: 'orange' };
    case 'CREDIT_CARD':
      return { label: 'Credit Card', color: 'red' };
    default:
      return { label: type, color: 'gray' };
  }
};

export const AccountsGrid: React.FC<AccountsGridProps> = ({
  accounts,
  onEdit,
  onDelete,
}) => {
  if (accounts.length === 0) {
    return (
      <Card withBorder p="lg" ta="center" radius="md">
        <Text c="dimmed">No accounts found. Click "Add Account" to get started.</Text>
      </Card>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
      {accounts.map((acc) => {
        const badge = getAccountBadge(acc.type);
        const isCreditCard = acc.type === 'CREDIT_CARD';
        const isDebt = isCreditCard && acc.current_balance < 0;

        return (
          <Card key={acc.id} withBorder shadow="xs" radius="md" p="md">
            <Group justify="space-between" mb="xs">
              <Badge
                leftSection={getAccountIcon(acc.type)}
                color={badge.color}
                variant="light"
                size="sm"
              >
                {badge.label}
              </Badge>

              <Menu position="bottom-end" shadow="md">
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Account options">
                    <IconDotsVertical size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconEdit size={14} />}
                    onClick={() => onEdit(acc)}
                  >
                    Edit Account
                  </Menu.Item>
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => onDelete(acc)}
                  >
                    Delete Account
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>

            <Box mt="xs">
              <Text fw={600} size="md" truncate>
                {acc.name}
              </Text>

              {isDebt ? (
                <Box mt={4}>
                  <Text size="xs" c="red.6" fw={600} tt="uppercase">
                    Outstanding Due
                  </Text>
                  <Text size="xl" fw={700} c="red.6">
                    {formatINR(Math.abs(acc.current_balance))}
                  </Text>
                </Box>
              ) : (
                <Box mt={4}>
                  <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                    Available Balance
                  </Text>
                  <Text
                    size="xl"
                    fw={700}
                    c={acc.current_balance < 0 ? 'red.6' : undefined}
                  >
                    {formatINR(acc.current_balance)}
                  </Text>
                </Box>
              )}
            </Box>
          </Card>
        );
      })}
    </SimpleGrid>
  );
};
