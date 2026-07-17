/**
 * Screen Template for Mobile Agent (React Native)
 *
 * Demonstrates best practices for React Native screens:
 *   - Typed navigation props (React Navigation v7 native-stack)
 *   - Consumes TanStack Query hooks (useTodosQuery + mutations) — NEVER axios directly
 *   - Explicit isPending / error-with-retry / empty / data states via the shared
 *     LoadingView / ErrorView / EmptyStateView components (snippets.md §12)
 *   - FlatList with a stable keyExtractor and item-level accessibility roles
 *   - RefreshControl wired to the query's refetch (pull-to-refresh)
 *   - StyleSheet at the bottom; no inline style objects in render
 *
 * Layout: src/features/todos/ui/ExampleScreen.tsx
 * The hooks (useTodosQuery, useToggleTodo, useDeleteTodo) live in
 * src/features/todos/{queries.ts,mutations.ts}; the screen only composes them.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  type ListRenderItem,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { LoadingView } from '@shared/components/LoadingView';
import { ErrorView } from '@shared/components/ErrorView';
import { EmptyStateView } from '@shared/components/EmptyStateView';
import { useTodosQuery } from '../queries';
import { useToggleTodo, useDeleteTodo } from '../mutations';
import type { Todo } from '@api/todos';

// Typed screen props: navigation.navigate is compile-time checked against the
// RootStackParamList, so passing the wrong params to 'TodoDetail' is a type error.
type Props = NativeStackScreenProps<RootStackParamList, 'TodoList'>;

export function ExampleScreen({ navigation }: Props) {
  // Read hook — returns cached data instantly and revalidates in the background.
  const { data: todos, isPending, isError, error, refetch, isRefetching } =
    useTodosQuery();

  // Write hooks — the screen fires intents; the hooks own optimistic updates,
  // rollback, and cache invalidation. The screen never touches the query cache.
  const toggleMutation = useToggleTodo();
  const deleteMutation = useDeleteTodo();

  // --- Intents -------------------------------------------------------------

  const handleToggle = useCallback(
    (id: string) => toggleMutation.mutate(id),
    [toggleMutation],
  );

  const handleDelete = useCallback(
    (id: string) => deleteMutation.mutate(id),
    [deleteMutation],
  );

  const handleOpenDetail = useCallback(
    (id: string) => navigation.navigate('TodoDetail', { id }),
    [navigation],
  );

  // renderItem is defined once (stable identity) so FlatList rows don't churn.
  const renderItem: ListRenderItem<Todo> = useCallback(
    ({ item }) => (
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => handleToggle(item.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.completed }}
          accessibilityLabel={`Toggle ${item.title}`}
        >
          <Text style={styles.checkboxGlyph}>{item.completed ? '☑' : '☐'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.titleContainer}
          onPress={() => handleOpenDetail(item.id)}
          accessibilityRole="button"
        >
          <Text style={[styles.title, item.completed && styles.completed]}>
            {item.title}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.title}`}
        >
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>
    ),
    [handleToggle, handleDelete, handleOpenDetail],
  );

  // --- State switch --------------------------------------------------------
  // Order matters: pending (first load, no cached data) → error → empty → data.
  // Each non-data state delegates to a shared component so every screen renders
  // them identically. isPending is the v5 first-load flag; isRefetching drives
  // the pull-to-refresh spinner without hiding already-cached rows.

  if (isPending) {
    return <LoadingView label="Loading todos" />;
  }

  if (isError) {
    return <ErrorView error={error} onRetry={refetch} />;
  }

  if (todos.length === 0) {
    return <EmptyStateView message="No todos yet. Add your first one!" />;
  }

  // --- Data state ----------------------------------------------------------

  return (
    <FlatList
      data={todos}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      // Keep the empty branch above authoritative; this is a defensive fallback.
      ListEmptyComponent={
        <EmptyStateView message="No todos yet. Add your first one!" />
      }
    />
  );
}

// StyleSheet at the bottom — StyleSheet.create freezes the objects and lets RN
// pass style IDs across the bridge instead of fresh objects on every render.
const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxGlyph: {
    fontSize: 18,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    color: '#212121',
  },
  completed: {
    textDecorationLine: 'line-through',
    color: '#9e9e9e',
  },
  deleteIcon: {
    color: '#9e9e9e',
    fontSize: 16,
    paddingLeft: 12,
  },
});
