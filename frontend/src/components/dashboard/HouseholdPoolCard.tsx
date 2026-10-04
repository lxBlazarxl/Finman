import React from 'react';
import {
  Card,
  Group,
  Stack,
  Text,
  Title,
  Badge,
  Table,
  Box,
} from '@mantine/core';
import { IconBuildingBank } from '@tabler/icons-react';
import type { HouseholdBalanceResponse } from '../../types';
import { formatINR } from '../../utils/currency';

interface HouseholdPoolCardProps {
  data: HouseholdBalanceResponse | null;
  loading: boolean;
}

export const HouseholdPoolCard: React.FC<HouseholdPoolCardProps> = ({
  data,
  loading,
}) => {
  if (loading || !data) return null;

  return (
    <Card withBorder shadow="sm" radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Group gap="xs">
              <IconBuildingBank size={20} color="gray" />
              <Text size="sm" c="dimmed" fw={500}>
                Household Liquidity Pool (Family Grand Total)
              </Text>
              <Badge color="violet" size="xs">
                Admin View
              </Badge>
            </Group>
            <Title order={2} size="h2" fw={800} c="violet.7">
              {formatINR(data.total_household_balance)}
            </Title>
            <Text size="xs" c="dimmed">
              Combined balance across all {data.members.length} household members
            </Text>
          </Stack>
        </Group>

        <Box mt="xs">
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
            Member Contribution Breakdown
          </Text>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Member</Table.Th>
                <Table.Th>Accounts</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Total Balance</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.members.map((m) => (
                <Table.Tr key={m.user_id}>
                  <Table.Td fw={500}>{m.user_name}</Table.Td>
                  <Table.Td>{m.accounts_count} accounts</Table.Td>
                  <Table.Td
                    style={{ textAlign: 'right' }}
                    fw={700}
                    c={m.total_balance < 0 ? 'red.6' : undefined}
                  >
                    {formatINR(m.total_balance)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      </Stack>
    </Card>
  );
};
