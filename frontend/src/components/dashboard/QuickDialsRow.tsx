import React, { useState } from 'react';
import {
  Card,
  Group,
  Button,
  Text,
  Stack,
  Alert,
  Modal,
  NumberInput,
  TextInput,
  Select,
  SimpleGrid,
} from '@mantine/core';
import {
  IconBolt,
  IconAlertCircle,
  IconCoffee,
  IconCar,
  IconShoppingCart,
  IconBottle,
  IconCookie,
  IconPlus,
} from '@tabler/icons-react';
import type { AccountResponse, TransactionResponse } from '../../types';
import { transactionsApi } from '../../api/client';
import { notifications } from '@mantine/notifications';

interface QuickDialsRowProps {
  accounts: AccountResponse[];
  categories: string[];
  onTransactionCreated: () => void;
}

interface QuickDialItem {
  label: string;
  amount: number;
  category: string;
  description: string;
  icon: React.ReactNode;
}

const QUICK_ITEMS: QuickDialItem[] = [
  { label: 'Chai ₹20', amount: 20, category: 'Food & Dining', description: 'Chai', icon: <IconCoffee size={14} /> },
  { label: 'Auto ₹50', amount: 50, category: 'Transport', description: 'Auto Rickshaw', icon: <IconCar size={14} /> },
  { label: 'Kirana ₹100', amount: 100, category: 'Groceries', description: 'Kirana Store', icon: <IconShoppingCart size={14} /> },
  { label: 'Milk ₹60', amount: 60, category: 'Groceries', description: 'Daily Milk', icon: <IconBottle size={14} /> },
  { label: 'Snacks ₹40', amount: 40, category: 'Food & Dining', description: 'Snacks', icon: <IconCookie size={14} /> },
];

export const QuickDialsRow: React.FC<QuickDialsRowProps> = ({
  accounts,
  categories,
  onTransactionCreated,
}) => {
  const cashAccounts = accounts.filter((a) => a.type === 'CASH');
  const [selectedCashAccountId, setSelectedCashAccountId] = useState<string>(
    cashAccounts.length > 0 ? cashAccounts[0].id : ''
  );

  const [customModalOpened, setCustomModalOpened] = useState(false);
  const [customAmount, setCustomAmount] = useState<number>(50);
  const [customCategory, setCustomCategory] = useState<string>('Miscellaneous');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const targetCashAccount = cashAccounts.find((a) => a.id === selectedCashAccountId) || cashAccounts[0];

  const handleQuickSpend = async (item: QuickDialItem) => {
    if (!targetCashAccount) return;

    setSubmitting(true);
    let createdTxPromise: Promise<TransactionResponse>;

    try {
      createdTxPromise = transactionsApi.createTransaction({
        account_id: targetCashAccount.id,
        amount: item.amount,
        type: 'EXPENSE',
        category: item.category,
        description: item.description,
      });

      notifications.show({
        id: `quick-${Date.now()}`,
        title: 'Cash Spend Recorded',
        message: `${item.description} (₹${item.amount}) deducted from ${targetCashAccount.name}`,
        color: 'emerald',
        autoClose: 4000,
        withCloseButton: true,
      });

      await createdTxPromise;
      onTransactionCreated();
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Could not record quick cash spend',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCashAccount || customAmount <= 0) return;

    setSubmitting(true);
    try {
      await transactionsApi.createTransaction({
        account_id: targetCashAccount.id,
        amount: customAmount,
        type: 'EXPENSE',
        category: customCategory,
        description: customDescription.trim() || 'Cash Expense',
      });

      notifications.show({
        title: 'Cash Spend Recorded',
        message: `₹${customAmount} recorded under ${customCategory}`,
        color: 'emerald',
      });

      setCustomModalOpened(false);
      setCustomDescription('');
      onTransactionCreated();
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to record custom cash spend',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (cashAccounts.length === 0) {
    return (
      <Card withBorder radius="md" p="sm">
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="gray"
          title="Cash Quick-Entry Inactive"
          radius="md"
        >
          No Cash account found. Create a Physical Cash account to enable 1-tap micro-spends.
        </Alert>
      </Card>
    );
  }

  return (
    <Card withBorder shadow="xs" radius="md" p="sm">
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconBolt size={16} color="var(--mantine-color-orange-6)" />
            <Text fw={600} size="xs" tt="uppercase" c="dimmed">
              Cash Quick-Entry
            </Text>
          </Group>

          {cashAccounts.length > 1 && (
            <Select
              size="xs"
              data={cashAccounts.map((a) => ({ value: a.id, label: a.name }))}
              value={selectedCashAccountId}
              onChange={(val) => setSelectedCashAccountId(val || cashAccounts[0].id)}
              style={{ width: 140 }}
            />
          )}
        </Group>

        <SimpleGrid cols={{ base: 3, sm: 6 }} spacing="xs">
          {QUICK_ITEMS.map((item) => (
            <Button
              key={item.description}
              size="xs"
              variant="light"
              color="gray"
              leftSection={item.icon}
              loading={submitting}
              onClick={() => handleQuickSpend(item)}
              px={6}
            >
              <Text size="xs" fw={500} truncate>
                {item.label}
              </Text>
            </Button>
          ))}

          <Button
            size="xs"
            variant="default"
            leftSection={<IconPlus size={14} />}
            onClick={() => setCustomModalOpened(true)}
            px={6}
          >
            Custom
          </Button>
        </SimpleGrid>
      </Stack>

      <Modal
        opened={customModalOpened}
        onClose={() => setCustomModalOpened(false)}
        title="Record Custom Cash Spend"
        centered
      >
        <form onSubmit={handleCustomCashSubmit}>
          <Stack gap="md">
            <NumberInput
              label="Amount"
              prefix="₹"
              required
              min={1}
              value={customAmount}
              onChange={(val) => setCustomAmount(Number(val) || 0)}
            />

            <Select
              label="Category"
              required
              searchable
              data={categories.map((c) => ({ value: c, label: c }))}
              value={customCategory}
              onChange={(val) => setCustomCategory(val || 'Miscellaneous')}
            />

            <TextInput
              label="Description / Note"
              placeholder="e.g. Vegetables, Auto fare"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.currentTarget.value)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setCustomModalOpened(false)}>
                Cancel
              </Button>
              <Button type="submit" color="emerald" loading={submitting}>
                Record Expense
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Card>
  );
};
