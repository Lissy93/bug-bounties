<script lang="ts">
  import Icon from './Icon.svelte';
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
      return 'website';
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
  <img class="logo" src="{getFaviconUrl(company.url)}" loading="lazy" alt={company.company} />
  <div class="content">
    <p class="title">
      <a class="name" href={company.url} target="_blank">{company.company}</a>
      <a class="contact" href={company.contact}>
        <Icon name={contactIcon(company.contact)} />
        Contact
      </a>
    </p>
    {#if company.rewards && company.rewards.length > 0}
    <p title={`${company.rewards ?  company.rewards.join(', ') : 'None :(' }`}>
      Rewards:
      {#each (company.rewards || []) as reward}
        {#if reward === '*bounty'}
        <Icon name="bounty" color="#45f445" width="20" title="Bounty" />
        {/if}
        {#if reward === '*swag'}
        <Icon name="swag" color="#53c5fd" width="20" title="Swag" />
        {/if}
        {#if reward === '*recognition'}
        <Icon name="recognition" color="#f4419e" width="20" title="Recognition" />
        {/if}
      {/each}
    </p>
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
  transition: all 0.2s ease-in-out;
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
    align-items: baseline;
    .name {
      color: var(--primary);
      font-size: 1.2rem;
    }
    .contact {
      background: var(--primary-lighter);
      color: var(--background);
      font-size: 0.8rem;
      border-radius: 4px;
      padding: 0.1rem 0.2rem;
      text-decoration: none;
      display: flex;
      gap: 0.5rem;
      transition: all 0.2s ease-in-out;
      &:hover {
        background: var(--primary);
      }
    }
  }

}
</style>
