import React, { useState, useEffect } from 'react';
import {
  Modal,
  NumberInput,
  TextInput,
  Select,
  SegmentedControl,
  Button,
  Stack,
  Group,
  Text,
} from '@mantine/core';
import type {
  AccountResponse,
  TransactionResponse,
  TransactionType,
} from '../../types';
import { transactionsApi } from '../../api/client';
import { notifications } from '@mantine/notifications';

interface CreateTransactionModalProps {
  opened: boolean;
  onClose: () => void;
  accounts: AccountResponse[];
  categories: string[];
  onTransactionCreated: () => void;
}

export const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
  opened,
  onClose,
  accounts,
  categories,
  onTransactionCreated,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [category, setCategory] = useState<string>('Miscellaneous');
  const [description, setDescription] = useState<string>('');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || amount <= 0 || !category) return;

    setLoading(true);
    try {
      await transactionsApi.createTransaction({
        account_id: accountId,
        amount,
        type,
        category,
        description: description.trim() || undefined,
      });

      notifications.show({
        title: 'Transaction Created',
        message: 'Transaction recorded successfully',
        color: 'green',
      });

      setAmount(0);
      setDescription('');
      onTransactionCreated();
      onClose();
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to record transaction',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add Transaction" centered>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Group grow>
            <NumberInput
              label="Amount"
              prefix="₹"
              required
              min={1}
              value={amount}
              onChange={(val) => setAmount(Number(val) || 0)}
            />

            <div>
              <Text size="sm" fw={500} mb={4}>
                Type
              </Text>
              <SegmentedControl
                fullWidth
                data={[
                  { label: 'Expense', value: 'EXPENSE' },
                  { label: 'Income', value: 'INCOME' },
                ]}
                value={type}
                onChange={(val) => setType(val as TransactionType)}
              />
            </div>
          </Group>

          <Select
            label="Account"
            required
            data={accounts.map((a) => ({
              value: a.id,
              label: `${a.name} (₹${a.current_balance})`,
            }))}
            value={accountId}
            onChange={(val) => setAccountId(val || '')}
          />

          <Select
            label="Category"
            required
            searchable
            data={categories.map((c) => ({ value: c, label: c }))}
            value={category}
            onChange={(val) => setCategory(val || 'Miscellaneous')}
          />

          <TextInput
            label="Description / Note"
            placeholder="e.g. Lunch, Groceries, Petrol"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Save Transaction
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

interface EditTransactionModalProps {
  transaction: TransactionResponse | null;
  opened: boolean;
  onClose: () => void;
  categories: string[];
  onTransactionUpdated: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  transaction,
  opened,
  onClose,
  categories,
  onTransactionUpdated,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [category, setCategory] = useState<string>('Miscellaneous');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount);
      setType(transaction.type);
      setCategory(transaction.category);
      setDescription(transaction.description || '');
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || amount <= 0 || !category) return;

    setLoading(true);
    try {
      await transactionsApi.updateTransaction(transaction.id, {
        amount,
        type,
        category,
        description: description.trim() || undefined,
      });

      notifications.show({
        title: 'Transaction Updated',
        message: 'Changes saved successfully',
        color: 'green',
      });

      onTransactionUpdated();
      onClose();
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Could not update transaction',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Transaction" centered>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Group grow>
            <NumberInput
              label="Amount"
              prefix="₹"
              required
              min={1}
              value={amount}
              onChange={(val) => setAmount(Number(val) || 0)}
            />

            <div>
              <Text size="sm" fw={500} mb={4}>
                Type
              </Text>
              <SegmentedControl
                fullWidth
                data={[
                  { label: 'Expense', value: 'EXPENSE' },
                  { label: 'Income', value: 'INCOME' },
                ]}
                value={type}
                onChange={(val) => setType(val as TransactionType)}
              />
            </div>
          </Group>

          <Select
            label="Category"
            required
            searchable
            data={categories.map((c) => ({ value: c, label: c }))}
            value={category}
            onChange={(val) => setCategory(val || 'Miscellaneous')}
          />

          <TextInput
            label="Description / Note"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
