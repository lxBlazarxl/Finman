import React from 'react';
import { useMantineColorScheme, ActionIcon, Tooltip } from '@mantine/core';
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';

export const ThemeToggle: React.FC = () => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const cycleColorScheme = () => {
    if (colorScheme === 'light') {
      setColorScheme('dark');
    } else if (colorScheme === 'dark') {
      setColorScheme('auto');
    } else {
      setColorScheme('light');
    }
  };

  const getIcon = () => {
    if (colorScheme === 'dark') return <IconMoon size={18} />;
    if (colorScheme === 'light') return <IconSun size={18} />;
    return <IconDeviceDesktop size={18} />;
  };

  const getLabel = () => {
    if (colorScheme === 'dark') return 'Dark theme (click for system)';
    if (colorScheme === 'light') return 'Light theme (click for dark)';
    return 'System theme (click for light)';
  };

  return (
    <Tooltip label={getLabel()} withArrow>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        onClick={cycleColorScheme}
        aria-label="Toggle color scheme"
      >
        {getIcon()}
      </ActionIcon>
    </Tooltip>
  );
};
