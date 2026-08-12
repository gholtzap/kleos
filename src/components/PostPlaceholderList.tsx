import * as stylex from "@stylexjs/stylex";
import { appColors } from "../app-tokens.stylex";

interface PostPlaceholderListProps {
  count: number;
}

export function PostPlaceholderList({ count }: PostPlaceholderListProps) {
  return (
    <div>
      {Array.from({ length: count }, (_, index) => (
        <article
          {...stylex.props(styles.post)}
          aria-label={`Post placeholder ${index + 1}`}
          key={index}
        >
          <span {...stylex.props(styles.avatar)} />
          <div {...stylex.props(styles.body)}>
            <div {...stylex.props(styles.line, styles.authorLine)} />
            <div {...stylex.props(styles.line)} />
            <div {...stylex.props(styles.line, styles.shortLine)} />
            {index % 2 === 1 ? <div {...stylex.props(styles.media)} /> : null}
            <div {...stylex.props(styles.actions)}>
              {Array.from({ length: 5 }, (_, actionIndex) => (
                <span {...stylex.props(styles.action)} key={actionIndex} />
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

const styles = stylex.create({
  post: {
    display: "flex",
    minHeight: 170,
    paddingBlock: 12,
    paddingInline: 16,
    gap: 10,
    borderBottomColor: appColors.border,
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    flexBasis: 40,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: appColors.border,
    borderRadius: "50%",
  },
  body: {
    display: "flex",
    minWidth: 0,
    flex: 1,
    flexDirection: "column",
    gap: 10,
  },
  line: {
    width: "92%",
    height: 12,
    backgroundColor: "#202327",
    borderRadius: 9999,
  },
  authorLine: {
    width: "42%",
    height: 14,
    backgroundColor: appColors.border,
  },
  shortLine: { width: "68%" },
  media: {
    width: "100%",
    aspectRatio: "16 / 7",
    backgroundColor: "#202327",
    borderRadius: 16,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
  },
  action: {
    width: 18,
    height: 18,
    backgroundColor: "#202327",
    borderRadius: "50%",
  },
});
