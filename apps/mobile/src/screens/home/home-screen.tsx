import { ScrollView, Text } from "react-native";

const placeholderParagraphs = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet.",
  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium. Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.",
  "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit. Sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt, neque porro quisquam est qui dolorem ipsum quia dolor sit amet.",
  "Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.",
  "Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur. Excepteur sint occaecat cupidatat non proident.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Sunt in culpa qui officia deserunt mollit anim id est laborum, curabitur blandit tempus porttitor.",
  "Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Maecenas faucibus mollis interdum. Aenean lacinia bibendum nulla sed consectetur. Donec ullamcorper nulla non metus auctor fringilla.",
] as const;

/**
 * Temporary scroll content for checking the native Home Large Title.
 *
 * Home owns no chat state. Its header opens a new conversation screen, while
 * this body stays deliberately neutral until the product's Home content is
 * decided.
 */
export function HomeScreen() {
  return (
    <ScrollView
      className="bg-background"
      contentContainerClassName="gap-6 px-5 pt-5 pb-12"
      contentInsetAdjustmentBehavior="automatic"
      testID="home-scroll"
    >
      {placeholderParagraphs.map((paragraph) => (
        <Text
          className="text-base text-foreground leading-7"
          key={paragraph}
          selectable
          testID="home-placeholder-paragraph"
        >
          {paragraph}
        </Text>
      ))}
    </ScrollView>
  );
}
