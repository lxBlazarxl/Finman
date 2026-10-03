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
  Badge,
  Text,
  Alert,
} from '@mantine/core';
import { IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import type {
  SMSParseResult,
  AccountResponse,
  TransactionType,
} from '../../types';
import { transactionsApi } from '../../api/client';
import { notifications } from '@mantine/notifications';

interface SmsParseModalProps {
  opened: boolean;
  onClose: () => void;
  parseResult: SMSParseResult | null;
  rawSms: string;
  accounts: AccountResponse[];
  categories: string[];
  onTransactionCreated: () => void;
}

export const SmsParseModal: React.FC<SmsParseModalProps> = ({
  opened,
  onClose,
  parseResult,
  rawSms,
  accounts,
  categories,
  onTransactionCreated,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [category, setCategory] = useState<string>('Miscellaneous');
  const [description, setDescription] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (parseResult) {
      setAmount(parseResult.amount || 0);
      setType(parseResult.type || 'EXPENSE');
      setCategory(parseResult.suggested_category || 'Miscellaneous');
      setDescription(parseResult.merchant || '');

      // Smart account match
      if (accounts.length > 0) {
        if (parseResult.bank_name) {
          const matched = accounts.find((a) =>
            a.name.toLowerCase().includes(parseResult.bank_name!.toLowerCase())
          );
          setAccountId(matched ? matched.id : accounts[0].id);
        } else {
          setAccountId(accounts[0].id);
        }
      }
    }
  }, [parseResult, accounts]);

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
        raw_sms: rawSms || undefined,
      });

      notifications.show({
        title: 'Transaction Recorded',
        message: `${type === 'EXPENSE' ? 'Expense' : 'Income'} of ₹${amount} recorded under ${category}`,
        color: 'green',
      });

      onTransactionCreated();
      onClose();
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Could not record transaction',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = () => {
    if (!parseResult) return null;
    switch (parseResult.confidence) {
      case 'HIGH':
        return (
          <Badge color="green" leftSection={<IconCheck size={12} />}>
            High Confidence
          </Badge>
        );
      case 'MEDIUM':
        return (
          <Badge color="yellow" leftSection={<IconAlertTriangle size={12} />}>
            Medium Confidence
          </Badge>
        );
      case 'LOW':
        return (
          <Badge color="red" leftSection={<IconAlertTriangle size={12} />}>
            Low Confidence (Please Review)
          </Badge>
        );
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Text fw={700}>Review Parsed Transaction</Text>
          {getConfidenceBadge()}
        </Group>
      }
      centered
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {parseResult?.confidence === 'LOW' && (
            <Alert color="orange" radius="md">
              Could not fully detect all fields from the SMS. Please verify the amount, account, and category.
            </Alert>
          )}

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
                Transaction Type
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
            label="Target Account"
            required
            data={accounts.map((a) => ({
              value: a.id,
              label: `${a.name} (Balance: ₹${a.current_balance})`,
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
            label="Merchant / Note"
            placeholder="e.g. Swiggy, Uber, Kirana store"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />

          {rawSms && (
            <Text size="xs" c="dimmed" lineClamp={2}>
              Raw SMS: {rawSms}
            </Text>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Confirm & Record
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
