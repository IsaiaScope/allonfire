/** The three sentences a bulk delete can end in, each already translated. */
type Say = {
  done: (count: number) => string;
  gone: (count: number) => string;
  partly: (deleted: number, gone: number) => string;
};

/**
 * What a bulk delete tells: how many went, and how many another Admin had
 * deleted already (the list on screen is a snapshot; deleting them again
 * changes nothing). `asked` ids were sent, `deleted` is what the API counted.
 */
export const deletionMessage = (asked: number, deleted: number, say: Say) => {
  const gone = asked - deleted;
  if (gone === 0) {
    return say.done(deleted);
  }
  return deleted === 0 ? say.gone(gone) : say.partly(deleted, gone);
};
