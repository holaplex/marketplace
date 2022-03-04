import React from 'react';
import { KeyType } from '../../types';
import { isEmpty, range, map } from 'ramda';

interface ListProps<D> {
  itemRender: (item: D, index: number) => React.ReactNode;
  data: D[] | undefined;
  dataKey?: string;
  loading: boolean;
  emptyComponent: React.ReactNode;
  loadingComponent: React.ReactNode;
  loadingCount?: number;
  gridClassName?: string;
}

export function List<D extends KeyType>({
  itemRender,
  data,
  loading,
  emptyComponent,
  loadingComponent,
  dataKey = 'address',
  loadingCount = 12,
  gridClassName = 'grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-8 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4 xl:gap-8',
}: ListProps<D>) {
  return (
    <div className="container md:mx-auto lg:mx-auto">
      {loading ? (
        <ul className={gridClassName}>
          {map((i: number) => (
            <li key={i}>
              {loadingComponent}
            </li>
          )
          )(range(0, loadingCount))}
        </ul>
      ) : (
        isEmpty(data) ? (
          emptyComponent
        ) : (
          <ul className={gridClassName}>
            {(data || []).map((d, i) => {
              return (
                <li key={d[dataKey]}>
                  {itemRender(d, i)}
                </li>
              )
            })}
          </ul>
        )
      )}
    </div>
  )
}


