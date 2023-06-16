import { useTheme } from '@material-ui/core/styles';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KubeObject } from '../../../lib/k8s/cluster';
import { useFilterFunc } from '../../../lib/util';
import { useTypedSelector } from '../../../redux/reducers/reducers';
import { useSettings } from '../../App/Settings/hook';
import ActionButton from '../ActionButton';
import { DateLabel } from '../Label';
import Link from '../Link';
import SimpleTable, { SimpleTableProps } from '../SimpleTable';
import TableColumnChooserPopup from '../TableColumnChooserPopup';

type SimpleTableColumn = SimpleTableProps['columns'][number];

type ColumnType = 'age' | 'name' | 'namespace' | 'type' | 'kind';

export interface ResourceTableProps extends Omit<SimpleTableProps, 'columns'> {
  /** The columns to be rendered, like used in SimpleTable, or by name. */
  columns: (SimpleTableColumn | ColumnType)[];
  /** ID for the table. Will be used by plugins to identify this table.
   * Official tables in Headlamp will have the 'headlamp-' prefix for their IDs which is followed by the resource's plural name or the section in Headlamp the table is in.
   * Plugins should use their own prefix when creating tables, to avoid any clashes.
   */
  id?: string;
  /** Deny plugins to process this table's columns. */
  noProcessing?: boolean;
}

export interface ResourceTableFromResourceClassProps extends Omit<ResourceTableProps, 'data'> {
  resourceClass: KubeObject;
}

export default function ResourceTable(
  props: ResourceTableFromResourceClassProps | ResourceTableProps
) {
  if (!!(props as ResourceTableFromResourceClassProps).resourceClass) {
    const { resourceClass, ...otherProps } = props as ResourceTableFromResourceClassProps;
    return <TableFromResourceClass resourceClass={resourceClass!} {...otherProps} />;
  }

  return <Table {...(props as ResourceTableProps)} />;
}

/**
 * Returns a throttled version of the input value.
 *
 * @param value - The value to be throttled.
 * @param interval - The interval in milliseconds to throttle the value.
 * @returns The throttled value.
 */
export function useThrottle(value: any, interval = 1000): any {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastEffected = useRef(Date.now() + interval);

  // Ensure we don't throttle holding the loading null or undefined value before
  // real data comes in. Otherwise we could wait up to interval milliseconds
  // before we update the throttled value.
  //
  //   numEffected == 0,  null, or undefined whilst loading.
  //   numEffected == 1,  real data.
  const numEffected = useRef(0);

  useEffect(() => {
    const now = Date.now();

    if (now >= lastEffected.current + interval || numEffected.current < 2) {
      numEffected.current = numEffected.current + 1;
      lastEffected.current = now;
      setThrottledValue(value);
    } else {
      const id = window.setTimeout(() => {
        lastEffected.current = now;
        setThrottledValue(value);
      }, interval);

      return () => window.clearTimeout(id);
    }
  }, [value, interval]);

  return throttledValue;
}

function TableFromResourceClass(props: ResourceTableFromResourceClassProps) {
  const { resourceClass, id, ...otherProps } = props;
  const [items, error] = resourceClass.useList();
  // throttle the update of the table to once per second
  const throttledItems = useThrottle(items, 1000);

  return (
    <Table
      errorMessage={resourceClass.getErrorMessage(error)}
      id={id || `headlamp-${resourceClass.pluralName}`}
      {...otherProps}
      data={throttledItems}
    />
  );
}

function Table(props: ResourceTableProps) {
  const { columns, defaultSortingColumn, id, noProcessing = false, ...otherProps } = props;
  const { t } = useTranslation(['glossary', 'frequent']);
  const theme = useTheme();
  const storeRowsPerPageOptions = useSettings('tableRowsPerPageOptions');
  const tableProcessors = useTypedSelector(state => state.ui.views.tableColumnsProcessors);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  let sortingColumn = defaultSortingColumn;

  let processedColumns = columns;

  if (!noProcessing) {
    tableProcessors.forEach(processorInfo => {
      console.debug('Processing columns with processor: ', processorInfo.id, '...');
      processedColumns = processorInfo.processor({ id: id || '', columns: processedColumns }) || [];
    });
  }

  const cols: SimpleTableColumn[] = processedColumns.map((col, index) => {
    if (typeof col !== 'string') {
      return col;
    }

    switch (col) {
      case 'name':
        return {
          label: t('frequent|Name'),
          getter: (resource: KubeObject) => <Link kubeObject={resource} />,
          sort: (n1: KubeObject, n2: KubeObject) => {
            if (n1.metadata.name < n2.metadata.name) {
              return -1;
            } else if (n1.metadata.name > n2.metadata.name) {
              return 1;
            }
            return 0;
          },
        };
      case 'age':
        if (sortingColumn === undefined) {
          sortingColumn = index + 1;
        }
        return {
          label: t('frequent|Age'),
          cellProps: { style: { textAlign: 'right' } },
          getter: resource => (
            <DateLabel
              date={resource.metadata.creationTimestamp}
              format="mini"
              iconProps={{ color: theme.palette.grey.A700 }}
            />
          ),
          sort: (n1: KubeObject, n2: KubeObject) =>
            new Date(n2.metadata.creationTimestamp).getTime() -
            new Date(n1.metadata.creationTimestamp).getTime(),
        };
      case 'namespace':
        return {
          label: t('glossary|Namespace'),
          getter: (resource: KubeObject) =>
            resource.getNamespace() ? (
              <Link routeName="namespace" params={{ name: resource.getNamespace() }}>
                {resource.getNamespace()}
              </Link>
            ) : (
              ''
            ),
          sort: true,
        };
      case 'type':
      case 'kind':
        return {
          label: t('frequent|Type'),
          getter: (resource: KubeObject) => resource.kind,
          sort: true,
        };
      default:
        throw new Error(`Unknown column: ${col}`);
    }
  });

  cols.push({
    label: 'lll',
    header: (
      <ActionButton
        iconButtonProps={{ size: 'small' }}
        description={t('frequent|Filter columns')}
        icon="mdi:format-list-checks"
        onClick={event => {
          setAnchorEl(event.currentTarget);
        }}
      />
    ),
    cellProps: { style: { textAlign: 'right', maxWidth: '45px' } },
    getter: () => null,
  });

  return (
    <>
      <SimpleTable
        columns={cols}
        rowsPerPage={storeRowsPerPageOptions}
        defaultSortingColumn={sortingColumn}
        filterFunction={useFilterFunc()}
        reflectInURL
        {...otherProps}
      />
      <TableColumnChooserPopup
        columns={cols}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        onToggleColumn={col => console.log('>>>>>COLL', col)}
      />
    </>
  );
}
