import React, { useState } from 'react';
import {
  Stack,
  Card,
  Group,
  Title,
  Text,
  Select,
  SegmentedControl,
  SimpleGrid,
  Box,
  Center,
  Loader,
  Badge,
  Table,
} from '@mantine/core';
import { DonutChart } from '@mantine/charts';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconPigMoney,
  IconPercentage,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { formatINR } from '../utils/currency';

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const YEARS = ['2025', '2026', '2027'];

const CHART_COLORS = [
  'emerald.6',
  'blue.6',
  'indigo.6',
  'teal.6',
  'cyan.6',
  'violet.6',
  'orange.6',
  'grape.6',
];

export const AnalyticsView: React.FC = () => {
  const { isAdmin } = useAuthStore();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()));
  const [scope, setScope] = useState<'personal' | 'household'>('personal');

  const monthNum = parseInt(selectedMonth, 10);
  const yearNum = parseInt(selectedYear, 10);

  // Queries
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics', 'summary', scope, yearNum, monthNum],
    queryFn: () =>
      analyticsApi.getMonthlySummary({
        year: yearNum,
        month: monthNum,
        scope,
      }),
  });

  const { data: breakdown, isLoading: breakdownLoading } = useQuery({
    queryKey: ['analytics', 'category', scope, yearNum, monthNum],
    queryFn: () =>
      analyticsApi.getCategoryBreakdown({
        year: yearNum,
        month: monthNum,
        scope,
      }),
  });

  const chartData = (breakdown?.categories || []).map((cat, index) => ({
    name: cat.category,
    value: cat.total_amount,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const isLoading = summaryLoading || breakdownLoading;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <Title order={2} size="h3">
          Analytics
        </Title>

        <Group gap="xs" wrap="wrap">
          {isAdmin && (
            <SegmentedControl
              size="xs"
              data={[
                { label: 'Personal', value: 'personal' },
                { label: 'Family', value: 'household' },
              ]}
              value={scope}
              onChange={(val) => setScope(val as 'personal' | 'household')}
            />
          )}

          <Group gap={6} wrap="nowrap">
            <Select
              size="xs"
              data={MONTHS}
              value={selectedMonth}
              onChange={(val) => setSelectedMonth(val || String(now.getMonth() + 1))}
              style={{ width: 120 }}
            />

            <Select
              size="xs"
              data={YEARS}
              value={selectedYear}
              onChange={(val) => setSelectedYear(val || String(now.getFullYear()))}
              style={{ width: 80 }}
            />
          </Group>
        </Group>
      </Group>

      {/* Monthly Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        <Card withBorder shadow="xs" radius="md" p="md">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Total Income
            </Text>
            <IconTrendingUp size={20} color="green" />
          </Group>
          <Title order={3} size="h2" fw={700} c="green.7" mt="xs">
            {formatINR(summary?.total_income ?? 0)}
          </Title>
        </Card>

        <Card withBorder shadow="xs" radius="md" p="md">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Total Expense
            </Text>
            <IconTrendingDown size={20} color="red" />
          </Group>
          <Title order={3} size="h2" fw={700} c="red.6" mt="xs">
            {formatINR(summary?.total_expense ?? 0)}
          </Title>
        </Card>

        <Card withBorder shadow="xs" radius="md" p="md">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Net Savings
            </Text>
            <IconPigMoney size={20} color="blue" />
          </Group>
          <Title
            order={3}
            size="h2"
            fw={700}
            c={(summary?.net_savings ?? 0) < 0 ? 'red.6' : 'blue.7'}
            mt="xs"
          >
            {formatINR(summary?.net_savings ?? 0)}
          </Title>
        </Card>

        <Card withBorder shadow="xs" radius="md" p="md">
          <Group justify="space-between">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Savings Rate
            </Text>
            <IconPercentage size={20} color="gray" />
          </Group>
          <Title order={3} size="h2" fw={700} mt="xs">
            {summary?.savings_rate_percentage ?? 0}%
          </Title>
        </Card>
      </SimpleGrid>

      {/* Category Breakdown & Donut Chart */}
      <Card withBorder shadow="xs" radius="md" p="lg">
        <Title order={3} size="h4" mb="md">
          Expense Category Breakdown
        </Title>

        {isLoading ? (
          <Center h={250}>
            <Loader size="md" />
          </Center>
        ) : chartData.length === 0 ? (
          <Center h={180}>
            <Text c="dimmed">No expenses recorded for this month.</Text>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            <Center>
              <Stack align="center" gap="sm">
                <DonutChart
                  data={chartData}
                  size={220}
                  thickness={28}
                  withTooltip
                />
                <Text size="xs" c="dimmed">
                  Total Expenses: {formatINR(breakdown?.total_expenses ?? 0)}
                </Text>
              </Stack>
            </Center>

            <Box style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Category</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Share</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {breakdown?.categories.map((c, i) => (
                    <Table.Tr key={c.category}>
                      <Table.Td>
                        <Group gap="xs">
                          <Box
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              backgroundColor: `var(--mantine-color-${CHART_COLORS[i % CHART_COLORS.length].replace('.', '-')})`,
                            }}
                          />
                          <Text size="sm" fw={500}>
                            {c.category}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }} fw={600}>
                        {formatINR(c.total_amount)}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Badge size="sm" variant="light" color="gray">
                          {c.percentage}%
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          </SimpleGrid>
        )}
      </Card>
    </Stack>
  );
};
