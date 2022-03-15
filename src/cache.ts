import { makeVar } from '@apollo/client';
import { Viewer } from './types.d';

export const viewerVar = makeVar<Viewer | null>(null);

export const sidebarOpenVar = makeVar<boolean>(false);