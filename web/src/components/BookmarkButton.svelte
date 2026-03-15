<script lang="ts">
  import { Bookmark, BookmarkCheck, BookmarkX } from "lucide-svelte";
  import { bookmarks } from "../lib/bookmarks";
  import { tips } from "../lib/tooltips";

  export let slug: string;
  export let companyName: string;

  let hovered = false;

  $: isBookmarked = $bookmarks.has(slug);

  function handleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    bookmarks.toggle(slug);
  }
</script>

<button
  class="bookmark-btn"
  class:bookmarked={isBookmarked}
  title={isBookmarked ? tips.bookmarkRemove : tips.bookmarkAdd}
  on:click={handleClick}
  on:mouseenter={() => (hovered = true)}
  on:mouseleave={() => (hovered = false)}
  aria-label={isBookmarked
    ? `Remove ${companyName} from saved programs`
    : `Save ${companyName} for quick access`}
>
  {#if isBookmarked && hovered}
    <BookmarkX size={18} />
  {:else if isBookmarked}
    <BookmarkCheck size={18} />
  {:else}
    <Bookmark size={18} />
  {/if}
</button>

<style>
  .bookmark-btn {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    border: none;
    border-radius: var(--curve, 4px);
    background: transparent;
    color: var(--muted, #ffffff60);
    cursor: pointer;
    opacity: 0;
    transition:
      opacity 0.15s ease-in-out,
      color 0.15s ease-in-out;
  }
  .bookmark-btn.bookmarked {
    opacity: 1;
    color: var(--primary, #fdc500);
  }
  .bookmark-btn:hover {
    color: var(--primary, #fdc500);
  }
</style>
