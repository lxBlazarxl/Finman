import React, { useState } from 'react';
import { Card, TextInput, Button, Group, ActionIcon } from '@mantine/core';
import { IconClipboard, IconSparkles, IconArrowRight } from '@tabler/icons-react';
import { transactionsApi } from '../../api/client';
import type { SMSParseResult } from '../../types';
import { notifications } from '@mantine/notifications';

interface RapidSmsDockProps {
  onParsed: (result: SMSParseResult, rawText: string) => void;
}

export const RapidSmsDock: React.FC<RapidSmsDockProps> = ({ onParsed }) => {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);

  const handleParse = async (smsText: string) => {
    const trimmed = smsText.trim();
    if (!trimmed || trimmed.length < 5) return;

    setParsing(true);
    try {
      const result = await transactionsApi.parseSMS(trimmed);
      setText('');
      onParsed(result, trimmed);
    } catch {
      notifications.show({
        title: 'Parsing Failed',
        message: 'Could not detect transaction from SMS text. Ensure message contains amount details.',
        color: 'red',
      });
    } finally {
      setParsing(false);
    }
  };

  const handleClipboardPaste = async () => {
    if (typeof window !== 'undefined' && window.isSecureContext && navigator.clipboard?.readText) {
      try {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          setText(clipText);
          await handleParse(clipText);
        }
      } catch {
        notifications.show({
          title: 'Clipboard Access Restricted',
          message: 'Please paste the SMS manually into the text input.',
          color: 'yellow',
        });
      }
    } else {
      notifications.show({
        title: 'Clipboard Restricted',
        message: 'Clipboard API requires secure context. Please paste manually.',
        color: 'yellow',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleParse(text);
    }
  };

  return (
    <Card withBorder shadow="xs" radius="md" p="sm">
      <Group gap="xs" wrap="nowrap">
        <TextInput
          style={{ flex: 1 }}
          leftSection={<IconSparkles size={16} color="var(--mantine-color-emerald-6)" />}
          placeholder="Paste bank SMS or UPI transaction..."
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          disabled={parsing}
          rightSection={
            text.trim().length >= 5 ? (
              <ActionIcon
                size="sm"
                variant="filled"
                color="emerald"
                loading={parsing}
                onClick={() => handleParse(text)}
                aria-label="Process SMS"
              >
                <IconArrowRight size={14} />
              </ActionIcon>
            ) : (
              <ActionIcon
                size="sm"
                variant="subtle"
                color="emerald"
                loading={parsing}
                onClick={handleClipboardPaste}
                aria-label="Paste SMS from clipboard"
              >
                <IconClipboard size={16} />
              </ActionIcon>
            )
          }
        />

        <Button
          size="sm"
          variant="light"
          color="emerald"
          leftSection={<IconClipboard size={14} />}
          onClick={handleClipboardPaste}
          loading={parsing}
          visibleFrom="sm"
        >
          Paste SMS
        </Button>
      </Group>
    </Card>
  );
};
