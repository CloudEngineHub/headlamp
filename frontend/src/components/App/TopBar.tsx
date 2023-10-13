import { Icon } from '@iconify/react';
import AppBar from '@material-ui/core/AppBar';
import IconButton from '@material-ui/core/IconButton';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import { createStyles, makeStyles, Theme, useTheme } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { has } from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import helpers from '../../helpers';
import { getToken, setToken } from '../../lib/auth';
import { useCluster, useClustersConf } from '../../lib/k8s';
import { createRouteURL } from '../../lib/router';
import {
  AppBarAction,
  AppBarActionsProcessor,
  DefaultAppBarAction,
  HeaderAction,
  HeaderActionType,
} from '../../redux/actionButtonsSlice';
import { setVersionDialogOpen, setWhetherSidebarOpen } from '../../redux/actions/actions';
import { useTypedSelector } from '../../redux/reducers/reducers';
import { SettingsButton } from '../App/Settings';
import { ClusterTitle } from '../cluster/Chooser';
import ErrorBoundary from '../common/ErrorBoundary';
import { drawerWidth } from '../Sidebar';
import HeadlampButton from '../Sidebar/HeadlampButton';
import { AppLogo } from './AppLogo';
import Notifications from './Notifications';

export interface TopBarProps {}

export function useAppBarActionsProcessed() {
  const appBarActions = useTypedSelector(state => state.actionButtons.appBarActions);
  const appBarActionsProcessors = useTypedSelector(
    state => state.actionButtons.appBarActionsProcessors
  );

  return { appBarActions, appBarActionsProcessors };
}

export function processAppBarActions(
  appBarActions: AppBarAction[],
  appBarActionsProcessors: AppBarActionsProcessor[]
): AppBarAction[] {
  let appBarActionsProcessed = [...appBarActions];
  for (const appBarActionsProcessor of appBarActionsProcessors) {
    appBarActionsProcessed = appBarActionsProcessor.processor({ actions: appBarActionsProcessed });
  }
  return appBarActionsProcessed;
}

export default function TopBar({}: TopBarProps) {
  const dispatch = useDispatch();
  const isMedium = useMediaQuery('(max-width:960px)');

  const isSidebarOpen = useTypedSelector(state => state.ui.sidebar.isSidebarOpen);
  const isSidebarOpenUserSelected = useTypedSelector(
    state => state.ui.sidebar.isSidebarOpenUserSelected
  );
  const hideAppBar = useTypedSelector(state => state.ui.hideAppBar);

  const clustersConfig = useClustersConf();
  const cluster = useCluster();
  const history = useHistory();
  const { appBarActions, appBarActionsProcessors } = useAppBarActionsProcessed();

  function hasToken() {
    return !!cluster ? !!getToken(cluster) : false;
  }

  function logout() {
    if (!!cluster) {
      setToken(cluster, null);
    }
    history.push('/');
  }

  if (hideAppBar) {
    return null;
  }
  return (
    <PureTopBar
      appBarActions={appBarActions}
      appBarActionsProcessors={appBarActionsProcessors}
      logout={logout}
      hasToken={hasToken()}
      isSidebarOpen={isSidebarOpen}
      isSidebarOpenUserSelected={isSidebarOpenUserSelected}
      onToggleOpen={() => {
        // For medium view we default to closed if they have not made a selection.
        // This handles the case when the user resizes the window from large to small.
        // If they have not made a selection then the window size stays the default for
        //   the size.

        const openSideBar =
          isMedium && isSidebarOpenUserSelected === undefined ? false : isSidebarOpen;

        dispatch(setWhetherSidebarOpen(!openSideBar));
      }}
      cluster={cluster || undefined}
      clusters={clustersConfig || undefined}
    />
  );
}

export interface PureTopBarProps {
  /** If the sidebar is fully expanded open or shrunk. */
  appBarActions: AppBarAction[];
  /** functions which filter the app bar action buttons */
  appBarActionsProcessors?: AppBarActionsProcessor[];
  logout: () => void;
  hasToken: boolean;
  clusters?: {
    [clusterName: string]: any;
  };
  cluster?: string;
  isSidebarOpen?: boolean;
  isSidebarOpenUserSelected?: boolean;

  /** Called when sidebar toggles between open and closed. */
  onToggleOpen: () => void;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    appbar: {
      marginLeft: drawerWidth,
      zIndex: theme.zIndex.drawer + 1,
      '& > *': {
        color: theme.palette.text.primary,
      },
    },
    toolbar: {
      [theme.breakpoints.down('xs')]: {
        paddingLeft: 0,
        paddingRight: 0,
      },
    },
    grow: {
      flexGrow: 1,
    },
    clusterTitle: {
      paddingRight: theme.spacing(10),
    },
    versionLink: {
      textAlign: 'center',
    },
    userMenu: {
      '& .MuiMenu-list': {
        paddingBottom: 0,
      },
    },
  })
);

function AppBarActionsMenu({ appBarActions }: { appBarActions: HeaderActionType[] }) {
  const actions = (function stateActions() {
    return React.Children.toArray(
      appBarActions.map(action => {
        const Action = has(action, 'action') ? (action as HeaderAction).action : action;
        if (React.isValidElement(Action)) {
          return (
            <ErrorBoundary>
              <MenuItem>{Action}</MenuItem>
            </ErrorBoundary>
          );
        } else if (Action === null) {
          return null;
        } else if (typeof Action === 'function') {
          return (
            <ErrorBoundary>
              <MenuItem>
                <Action />
              </MenuItem>
            </ErrorBoundary>
          );
        }
      })
    );
  })();

  return <>{actions}</>;
}
function AppBarActions({ appBarActions }: { appBarActions: HeaderActionType[] }) {
  const actions = (function stateActions() {
    return React.Children.toArray(
      appBarActions.map(action => {
        const Action = has(action, 'action') ? (action as HeaderAction).action : action;
        if (React.isValidElement(Action)) {
          return <ErrorBoundary>{Action}</ErrorBoundary>;
        } else if (Action === null) {
          return null;
        } else if (typeof Action === 'function') {
          return (
            <ErrorBoundary>
              <Action />
            </ErrorBoundary>
          );
        }
      })
    );
  })();

  return <>{actions}</>;
}

export function PureTopBar({
  appBarActions,
  appBarActionsProcessors = [],
  logout,
  hasToken,
  cluster,
  clusters,
  isSidebarOpen,
  isSidebarOpenUserSelected,
  onToggleOpen,
}: PureTopBarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const isMobile = useMediaQuery(theme.breakpoints.down('xs'));
  const dispatch = useDispatch();
  const history = useHistory();

  const openSideBar = !!(isSidebarOpenUserSelected === undefined ? false : isSidebarOpen);

  const classes = useStyles({ isSidebarOpen, isSmall });
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = React.useState<null | HTMLElement>(null);
  const isClusterContext = !!cluster;

  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMoreAnchorEl(null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    handleMobileMenuClose();
  };

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMoreAnchorEl(event.currentTarget);
  };
  const userMenuId = 'primary-user-menu';

  const renderUserMenu = !!isClusterContext && (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      id={userMenuId}
      keepMounted
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={isMenuOpen}
      onClose={() => {
        handleMenuClose();
        handleMobileMenuClose();
      }}
      style={{ zIndex: 1400 }}
      className={classes.userMenu}
    >
      <MenuItem
        component="a"
        onClick={() => {
          logout();
          handleMenuClose();
        }}
        disabled={!hasToken}
      >
        <ListItemIcon>
          <Icon icon="mdi:logout" />
        </ListItemIcon>
        <ListItemText primary={t('Log out')} secondary={hasToken ? null : t('(No token set up)')} />
      </MenuItem>
      <MenuItem
        component="a"
        onClick={() => {
          history.push(createRouteURL('settings'));
          handleMenuClose();
        }}
      >
        <ListItemIcon>
          <Icon icon="mdi:cog-box" />
        </ListItemIcon>
        <ListItemText>{t('translation|General Settings')}</ListItemText>
      </MenuItem>
      <MenuItem
        component="a"
        onClick={() => {
          dispatch(setVersionDialogOpen(true));
          handleMenuClose();
        }}
      >
        <ListItemIcon>
          <Icon icon="mdi:information-outline" />
        </ListItemIcon>
        <ListItemText>
          {helpers.getProductName()} {helpers.getVersion()['VERSION']}
        </ListItemText>
      </MenuItem>
    </Menu>
  );

  const mobileMenuId = 'primary-menu-mobile';
  const allAppBarActionsMobile: AppBarAction[] = [
    {
      id: DefaultAppBarAction.CLUSTER,
      action: isClusterContext && (
        <ClusterTitle cluster={cluster} clusters={clusters} onClick={() => handleMenuClose()} />
      ),
    },
    ...appBarActions,
    {
      id: DefaultAppBarAction.NOTIFICATION,
      action: (
        <MenuItem onClick={handleMenuClose}>
          <Notifications />
        </MenuItem>
      ),
    },
    {
      id: DefaultAppBarAction.SETTINGS,
      action: (
        <MenuItem>
          <SettingsButton onClickExtra={handleMenuClose} />
        </MenuItem>
      ),
    },
    {
      id: DefaultAppBarAction.USER,
      action: !!isClusterContext && (
        <MenuItem>
          <IconButton
            aria-label={t('Account of current user')}
            aria-controls={userMenuId}
            aria-haspopup="true"
            color="inherit"
            onClick={event => {
              handleMenuClose();
              handleProfileMenuOpen(event);
            }}
          >
            <Icon icon="mdi:account" />
          </IconButton>
        </MenuItem>
      ),
    },
  ];
  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMoreAnchorEl}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      id={mobileMenuId}
      keepMounted
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={isMobileMenuOpen}
      onClose={handleMobileMenuClose}
    >
      <AppBarActionsMenu
        appBarActions={processAppBarActions(allAppBarActionsMobile, appBarActionsProcessors)}
      />
    </Menu>
  );

  const allAppBarActions: AppBarAction[] = [
    {
      id: DefaultAppBarAction.CLUSTER,
      action: (
        <div className={classes.clusterTitle}>
          <ClusterTitle cluster={cluster} clusters={clusters} onClick={handleMobileMenuClose} />
        </div>
      ),
    },
    ...appBarActions,
    {
      id: DefaultAppBarAction.NOTIFICATION,
      action: <Notifications />,
    },
    {
      id: DefaultAppBarAction.SETTINGS,
      action: <SettingsButton onClickExtra={handleMenuClose} />,
    },
    {
      id: DefaultAppBarAction.USER,
      action: !!isClusterContext && (
        <IconButton
          aria-label={t('Account of current user')}
          aria-controls={userMenuId}
          aria-haspopup="true"
          onClick={handleProfileMenuOpen}
          color="inherit"
        >
          <Icon icon="mdi:account" />
        </IconButton>
      ),
    },
  ];
  return (
    <>
      <AppBar
        position="fixed"
        className={classes.appbar}
        elevation={1}
        component="nav"
        aria-label={t('Appbar Tools')}
      >
        <Toolbar className={classes.toolbar}>
          {isMobile && <HeadlampButton open={openSideBar} onToggleOpen={onToggleOpen} />}

          {!isSmall && (
            <>
              <AppLogo />
              <div className={classes.grow} />
              <AppBarActions
                appBarActions={processAppBarActions(allAppBarActions, appBarActionsProcessors)}
              />
            </>
          )}
          {isSmall && (
            <>
              {!isMobile && <AppLogo />}
              <div className={classes.grow} />
              <IconButton
                aria-label={t('show more')}
                aria-controls={mobileMenuId}
                aria-haspopup="true"
                onClick={handleMobileMenuOpen}
                color="inherit"
              >
                <Icon icon="mdi:more-vert" />
              </IconButton>
            </>
          )}
        </Toolbar>
      </AppBar>
      {renderUserMenu}
      {isSmall && renderMobileMenu}
    </>
  );
}
