<script lang="ts">
	import type { Company } from '../types/Company';
  export let company: Company;

  const getFaviconUrl = (companyUrl: string) => {
    const hostname = new URL(companyUrl).hostname;
    return `https://icon.horse/icon/${hostname}`;
  }

  const contactIcon = (contactUrl: string) => {
    if (contactUrl.includes('mailto:')) {
      return 'email';
    } else if (contactUrl.includes('http')) {
      return 'web';
    } else if (contactUrl.includes('twitter')) {
      return 'twitter';
    } else if (contactUrl.includes('github')) {
      return 'github';
    } else {
      return 'other';
    }
  }
</script>

<li class="company">
  <img class="logo" src="{getFaviconUrl(company.url)}" loading="lazy" />
  <div class="content">
    <p class="title">
      <a class="name" href={company.url}>{company.company}</a>
      <a class="contact" href={company.contact}>{contactIcon(company.contact)}</a>
    </p>
    {#if company.rewards && company.rewards.length > 0}
    <p>Rewards: {company.rewards.join(', ')}</p>
    {/if}
  </div>
</li>

<style lang="scss">
.company {
  border: 2px solid var(--primary-lighter);
  color: var(--foreground);
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 2px;
  transition: all 0.4s ease-in-out;
  &:hover {
    border-color: var(--primary);
    background: var(--background-lighter);
  }
  img {
    width: 4rem;
    height: 4rem;
    border-radius: 4px;
  }
  p { margin: 0; }
  .content {
    width: 100%;
    width: -moz-available;
  }
  .title {
    display: flex;
    justify-content: space-between;
    width: 100%;
    .name {
      color: var(--primary);
      font-size: 1.2rem;
    }
    .contact {
      background: var(--primary);
      color: var(--background);
      font-size: 0.8rem;
      border-radius: 4px;
      padding: 0.1rem 0.2rem;
      text-decoration: none;
    }
  }

}
</style>
