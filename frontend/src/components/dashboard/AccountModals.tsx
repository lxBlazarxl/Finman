import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  NumberInput,
  Button,
  Stack,
  Group,
} from '@mantine/core';
import type { AccountResponse, AccountType } from '../../types';
import { accountsApi } from '../../api/client';
import { notifications } from '@mantine/notifications';

interface AddAccountModalProps {
  opened: boolean;
  onClose: () => void;
  onAccountCreated: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  opened,
  onClose,
  onAccountCreated,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('BANK');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await accountsApi.createAccount({
        name: name.trim(),
        type,
        initial_balance: initialBalance,
      });
      notifications.show({
        title: 'Account Created',
        message: `${name} has been added successfully`,
        color: 'green',
      });
      setName('');
      setType('BANK');
      setInitialBalance(0);
      onAccountCreated();
      onClose();
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to create account',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add New Account" centered>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Account Name"
            placeholder="e.g. SBI Savings, Paytm Wallet"
            required
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />

          <Select
            label="Account Type"
            data={[
              { value: 'BANK', label: 'Bank Account' },
              { value: 'CASH', label: 'Cash Wallet / Physical Cash' },
              { value: 'WALLET', label: 'Digital Wallet (UPI/Paytm)' },
              { value: 'CREDIT_CARD', label: 'Credit Card' },
            ]}
            value={type}
            onChange={(val) => setType((val as AccountType) || 'BANK')}
            required
          />

          <NumberInput
            label="Initial Balance"
            prefix="₹"
            min={0}
            step={100}
            value={initialBalance}
            onChange={(val) => setInitialBalance(Number(val) || 0)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Account
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

interface EditAccountModalProps {
  account: AccountResponse | null;
  opened: boolean;
  onClose: () => void;
  onAccountUpdated: () => void;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  account,
  opened,
  onClose,
  onAccountUpdated,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('BANK');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !name.trim()) return;

    setLoading(true);
    try {
      await accountsApi.updateAccount(account.id, {
        name: name.trim(),
        type,
      });
      notifications.show({
        title: 'Account Updated',
        message: 'Account details saved',
        color: 'green',
      });
      onAccountUpdated();
      onClose();
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to update account',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Account" centered>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Account Name"
            required
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />

          <Select
            label="Account Type"
            data={[
              { value: 'BANK', label: 'Bank Account' },
              { value: 'CASH', label: 'Cash Wallet / Physical Cash' },
              { value: 'WALLET', label: 'Digital Wallet (UPI/Paytm)' },
              { value: 'CREDIT_CARD', label: 'Credit Card' },
            ]}
            value={type}
            onChange={(val) => setType((val as AccountType) || 'BANK')}
            required
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
