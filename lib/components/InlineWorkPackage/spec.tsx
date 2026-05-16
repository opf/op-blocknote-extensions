import { createReactInlineContentSpec } from "@blocknote/react";
import { InlineWorkPackageChip } from "./InlineWorkPackageChip";
import { linkToWorkPackage } from "../../services/openProjectApi";
import { hashesForSize } from "../WorkPackage/types";

export const openProjectWorkPackageInlineSpec = createReactInlineContentSpec(
  {
    type: "openProjectWorkPackageInline" as const,
    propSchema: {
      wpid: { default: "" },
      instanceId: { default: "" },
      size: { default: "s" },
    },
    content: "none",
  },
  {
    render: ({ inlineContent, contentRef }) => (
      <InlineWorkPackageChip inlineContent={inlineContent} contentRef={contentRef} />
    ),

    toExternalHTML: ({ inlineContent }) => {
      const { wpid, instanceId, size } = inlineContent.props;
      if (!wpid || wpid.startsWith("pending:")) return <></>;
      const numericWpid = Number(wpid);
      if (!Number.isFinite(numericWpid) || numericWpid <= 0) return <></>;
      return (
        <a
          href={linkToWorkPackage(numericWpid)}
          data-inline-content-type="openProjectWorkPackageInline"
          data-wpid={wpid}
          data-instance-id={instanceId}
          data-size={size}
        >
          {hashesForSize(size)}{wpid}
        </a>
      );
    },

    parse: (element) => {
      if (element.getAttribute("data-inline-content-type") !== "openProjectWorkPackageInline") {
        return undefined;
      }
      return {
        wpid: element.getAttribute("data-wpid") ?? "",
        instanceId: element.getAttribute("data-instance-id") ?? "",
        size: element.getAttribute("data-size") ?? "s",
      };
    },
  }
);
