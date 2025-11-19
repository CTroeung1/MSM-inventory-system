import { prisma } from "@/server/lib/prisma";
import type { TagGroup } from "@prisma/client";

// Higher Order function to traverse the Nary tree of tagGroup
export const traverseFromParent = async (
  rootId: string,
  callback: (node: TagGroup) => Promise<boolean | void> | boolean | void,
) => {
  const root = await prisma.tagGroup.findUnique({
    where: { id: rootId },
  });

  if (!root) return;

  const queue = [root];

  while (queue.length > 0) {
    const node = queue.shift()!;

    const shouldContinue = await callback(node);
    if (shouldContinue === false) break;

    const children = await prisma.tagGroup.findMany({
      where: { parentId: node.id },
    });

    queue.push(...children);
  }
};

export const isDescendant = async (rootId: string, targetId: string) => {
  if (rootId === targetId) return false;

  let found = false;

  await traverseFromParent(rootId, (node) => {
    if (node.id == targetId) {
      found = true;
      return false;
    }
  });
  return found;
};

export const collectDescendantsAndParent = async (parentId: string) => {
  const descendants: TagGroup[] = [];

  await traverseFromParent(parentId, (node) => {
    descendants.push(node);
  });

  return descendants;
};

export const traverseToRoot = async (
  startId: string,
  callback: (node: TagGroup) => Promise<boolean | void> | boolean | void,
): Promise<void> => {
  let currentId: string | null = startId;

  while (currentId) {
    const currentTagGroup: TagGroup | null =
      await prisma.tagGroup.findUniqueOrThrow({
        where: { id: currentId },
      });

    const shouldContinue = await callback(currentTagGroup);
    if (shouldContinue === false) break;

    currentId = currentTagGroup.parentId;
  }
};
