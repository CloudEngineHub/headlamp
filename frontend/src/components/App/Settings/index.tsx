import { Icon } from '@iconify/react';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Select,
  TextField,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import helpers from '../../../helpers';
import LocaleSelect from '../../../i18n/LocaleSelect/LocaleSelect';
import { createRouteURL } from '../../../lib/router';
import { setAppSettings, setVersionDialogOpen } from '../../../redux/actions/actions';
import { defaultTableRowsPerPageOptions } from '../../../redux/reducers/config';
import { ActionButton, NameValueTable, SectionBox } from '../../common';
import TimezoneSelect from '../../common/TimezoneSelect';
import { useSettings } from './hook';
import ThemeChangeButton from './ThemeChangeButton';

function NumberOfRowsForTablesInputComponent(props: { defaultValue: number[] }) {
  const { t } = useTranslation(['frequent', 'settings']);
  const { defaultValue } = props;
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [options, setOptions] = useState(defaultValue);
  const focusedRef = useCallback(node => {
    if (node !== null) {
      node.focus();
    }
  }, []);
  const defaultRowsPerPageValue = useMemo(() => {
    const val = helpers.getTablesRowsPerPage();
    if (options.includes(val)) {
      return val;
    }
    return defaultTableRowsPerPageOptions[0];
  }, []);
  const [selectedValue, setSelectedValue] = useState(defaultRowsPerPageValue);
  const storedCustomValue = useMemo(() => {
    const val = options.find(val => !defaultTableRowsPerPageOptions.includes(val));
    if (!val) {
      return defaultTableRowsPerPageOptions[0];
    }
    return val;
  }, []);
  const [customValue, setCustomValue] = useState<number | undefined>(storedCustomValue);
  const [errorMessage, setErrorMessage] = useState('');
  const [minRows, maxRows] = [5, 1000];
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setAppSettings({ tableRowsPerPageOptions: options }));
  }, [options]);

  // Make sure we update the value in the localStorage when the user selects a new value.
  useEffect(() => {
    if (selectedValue !== -1) {
      helpers.setTablesRowsPerPage(selectedValue);
    }
  }, [selectedValue]);

  const handleChange = (
    event: ChangeEvent<{
      name?: string | undefined;
      value: unknown;
    }>
  ) => {
    const val = parseInt(event.target.value as string);
    setSelectedValue(val);
  };

  const handleClose = () => {
    setIsSelectOpen(false);
  };

  const handleOpen = () => {
    setIsSelectOpen(true);
  };

  const suggestionMsg = t('settings|Enter a value between {{ minRows }} and {{ maxRows }}.', {
    minRows,
    maxRows,
  });

  return (
    // we have assigned value -1 to select custom option
    selectedValue === -1 ? (
      <Box display="inline-flex" alignItems="baseline">
        <TextField
          type={'number'}
          value={customValue}
          error={!!errorMessage}
          placeholder={t('settings|Custom row value')}
          helperText={errorMessage || suggestionMsg}
          inputProps={{ min: minRows, max: maxRows }}
          inputRef={focusedRef}
          onChange={e => {
            const val = parseInt(e.target.value);
            if (Number.isInteger(val)) {
              if (val < 5 || val > maxRows) {
                setErrorMessage(suggestionMsg);
              } else {
                setErrorMessage('');
              }
              setCustomValue(val);
            } else {
              setCustomValue(undefined);
            }
          }}
        />
        <Box display="inline-flex" alignItems="center" mx={1}>
          <Button
            variant="contained"
            disabled={!!errorMessage}
            size="small"
            onClick={() => {
              if (customValue === undefined) {
                return;
              }
              const newOptions = [...new Set([...defaultTableRowsPerPageOptions, customValue])];
              newOptions.sort((a, b) => a - b);
              setOptions(newOptions);
              setSelectedValue(customValue);
            }}
          >
            {t('frequent|Apply')}
          </Button>
          <IconButton
            aria-label={t('frequent|Delete')}
            onClick={() => {
              setOptions(defaultTableRowsPerPageOptions);
              setSelectedValue(defaultTableRowsPerPageOptions[0]);
            }}
          >
            <Icon icon="mdi:delete" />
          </IconButton>
        </Box>
      </Box>
    ) : (
      <FormControl>
        <Select
          value={selectedValue}
          style={{ width: '100px' }}
          open={isSelectOpen}
          onClose={handleClose}
          onOpen={handleOpen}
          onChange={handleChange}
          renderValue={value => `${value}`}
        >
          {options.map(option => {
            const isCustom = !defaultTableRowsPerPageOptions.includes(option);
            return (
              <MenuItem key={option} value={option}>
                <ListItemText primary={option} />
                {isCustom && (
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      aria-label={t('frequent|Delete')}
                      onClick={() => {
                        setOptions(defaultTableRowsPerPageOptions);
                        setSelectedValue(defaultTableRowsPerPageOptions[0]);
                        setIsSelectOpen(false);
                      }}
                    >
                      <Icon icon="mdi:delete" />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </MenuItem>
            );
          })}
          <MenuItem key={'custom'} value={-1}>
            {t('frequent|Custom value')}
          </MenuItem>
        </Select>
      </FormControl>
    )
  );
}

const useStyles = makeStyles(theme => ({
  valueCol: {
    width: '60%',
    [theme.breakpoints.down('sm')]: {
      width: 'unset',
    },
  },
}));

export default function Settings() {
  const classes = useStyles();
  const { t } = useTranslation(['settings', 'frequent']);
  const settingsObj = useSettings();
  const storedTimezone = settingsObj.timezone;
  const storedRowsPerPageOptions = settingsObj.tableRowsPerPageOptions;
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    storedTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      setAppSettings({
        timezone: selectedTimezone,
      })
    );
  }, [selectedTimezone]);

  return (
    <SectionBox
      title={t('frequent|General')}
      headerProps={{
        actions: [
          <ActionButton
            key="version"
            icon="mdi:information-outline"
            description={t('Version')}
            onClick={() => {
              dispatch(setVersionDialogOpen(true));
            }}
          />,
        ],
      }}
      backLink
    >
      <NameValueTable
        valueCellProps={{ className: classes.valueCol }}
        rows={[
          {
            name: t('frequent|Language'),
            value: <LocaleSelect showFullNames formControlProps={{ className: '' }} />,
          },
          {
            name: t('frequent|Theme'),
            value: <ThemeChangeButton showBothIcons />,
          },
          {
            name: t('settings|Number of rows for tables'),
            value: (
              <NumberOfRowsForTablesInputComponent
                defaultValue={storedRowsPerPageOptions || defaultTableRowsPerPageOptions}
              />
            ),
          },
          {
            name: t('settings|Timezone to display for dates'),
            value: (
              <Box maxWidth="350px">
                <TimezoneSelect
                  initialTimezone={selectedTimezone}
                  onChange={name => setSelectedTimezone(name)}
                />
              </Box>
            ),
          },
        ]}
      />
    </SectionBox>
  );
}

export function SettingsButton(props: { onClickExtra?: () => void }) {
  const { onClickExtra } = props;
  const { t } = useTranslation(['glossary']);
  const history = useHistory();

  return (
    <ActionButton
      icon="mdi:cog"
      description={t('frequent|Settings')}
      onClick={() => {
        history.push(createRouteURL('settings'));
        onClickExtra && onClickExtra();
      }}
    />
  );
}
