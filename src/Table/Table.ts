import { defineComponent, h, toRefs, VNode, provide } from 'vue'
import { ElTable, ElTableColumn, ElPagination } from 'element-plus'
import {
  useTableColumns,
  useTableBind,
  useTableDefaultBind,
  useTableMethods,
  usePagination,
} from '../composables'
import props from './props'
import ProTableItem from './TableItem'
import type {
  ITableSelectionColumns,
  ITableExpandColumns,
  ITableIndexColumns,
  ITableMenuColumns,
  StringObject,
} from '../types/index'

export default defineComponent({
  name: 'ProTable',
  props,
  emits: [
    'update:currentPage',
    'update:pageSize',
    'size-change',
    'current-change',
    'prev-click',
    'next-click',
  ],
  setup(props, { slots, attrs, emit, expose }) {
    const {
      selection,
      expand,
      index,
      menu,
      total,
      pageSize,
      currentPage,
      size,
    } = toRefs(props)
    const columns = useTableColumns(props)
    const defaultBind = useTableDefaultBind(props)
    const bindSelection = useTableBind<ITableSelectionColumns>(
      selection,
      defaultBind
    )
    const bindExpand = useTableBind<ITableExpandColumns>(expand, defaultBind)
    const bindIndex = useTableBind<ITableIndexColumns>(index, defaultBind)
    const bindMenu = useTableBind<ITableMenuColumns>(menu, defaultBind)
    const {
      pagination,
      sizeChange,
      currentChange,
      prevClick,
      nextClick,
    } = usePagination(props, emit)
    const {
      table,
      clearSelection,
      toggleRowSelection,
      toggleAllSelection,
      toggleRowExpansion,
      setCurrentRow,
      clearSort,
      clearFilter,
      doLayout,
      sort,
    } = useTableMethods()

    provide('defaultBind', defaultBind)

    expose({
      clearSelection,
      toggleRowSelection,
      toggleAllSelection,
      toggleRowExpansion,
      setCurrentRow,
      clearSort,
      clearFilter,
      doLayout,
      sort,
    })

    function createColumn() {
      let list: VNode[] = []

      if (selection.value) {
        list.push(
          h(ElTableColumn, { type: 'selection', ...bindSelection.value })
        )
      }
      if (expand.value !== false && slots.expand) {
        list.push(
          h(
            ElTableColumn,
            { type: 'expand', ...bindExpand.value },
            {
              default: (scope: unknown) => slots.expand && slots.expand(scope),
            }
          )
        )
      }
      if (index.value) {
        list.push(h(ElTableColumn, { type: 'index', ...bindIndex.value }))
      }
      if (columns.value) {
        const tableItem = columns.value.map((item) => {
          return h(ProTableItem, { item }, slots)
        })

        list = list.concat(tableItem)
      }
      if (slots.append) {
        list = list.concat(slots.append())
      }
      if (menu.value !== false && slots.menu) {
        list.push(
          h(
            ElTableColumn,
            { type: 'menu', ...bindMenu.value },
            {
              default: (scope: StringObject) =>
                slots.menu && slots.menu({ ...scope, size: size.value }),
            }
          )
        )
      }

      return list
    }

    return () => [
      h(
        ElTable,
        {
          ref: table,
          size: size.value as string,
          class: 'pro-table',
          ...attrs,
        },
        () => createColumn()
      ),
      total.value
        ? h(ElPagination, {
            ...pagination.value,
            currentPage: currentPage.value,
            pageSize: pageSize.value,
            total: total.value,
            class: 'pro-pagination',
            'onUpdate:pageSize': sizeChange,
            'onUpdate:currentPage': currentChange,
            onPrevClick: prevClick,
            onNextClick: nextClick,
          })
        : null,
    ]
  },
})
