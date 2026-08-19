import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OfficeScreen } from './office-screen';
import { OfficeLayoutState } from '../../../core/layout/office-layout-state';

describe('OfficeScreen', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeScreen],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('emits primaryAction when the primary button is clicked', () => {
    const fixture = TestBed.createComponent(OfficeScreen);
    fixture.componentRef.setInput('title', 'Inbound');
    fixture.componentRef.setInput('primaryActionLabel', 'Create purchase order');
    fixture.detectChanges();

    let callCount = 0;
    fixture.componentInstance.primaryAction.subscribe(() => callCount++);

    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    button.click();

    expect(callCount).toBe(1);
  });

  it('sets selectedKey when a row on the detailed tab is clicked', () => {
    const fixture = TestBed.createComponent(OfficeScreen);
    fixture.componentRef.setInput('title', 'Inbound');
    fixture.componentRef.setInput('tabs', [
      { id: 'orders', label: 'Orders', columns: [], rows: [{ key: 'po-1' }] },
      { id: 'receipts', label: 'Receipts', columns: [], rows: [{ key: 'rcp-1' }] },
    ]);
    fixture.componentRef.setInput('detailedTabId', 'orders');
    fixture.componentRef.setInput('rowKey', (row: Record<string, unknown>) => String(row['key']));
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      selectTab: (id: string) => void;
      onRowClick: (row: Record<string, unknown>) => void;
      selectedKey: () => string | null;
    };

    instance.selectTab('orders');
    instance.onRowClick({ key: 'po-1' });

    expect(instance.selectedKey()).toBe('po-1');
  });

  it('does not set selectedKey (or throw) when a row on a non-detailed tab is clicked', () => {
    const fixture = TestBed.createComponent(OfficeScreen);
    fixture.componentRef.setInput('title', 'Inbound');
    fixture.componentRef.setInput('tabs', [
      { id: 'orders', label: 'Orders', columns: [], rows: [{ key: 'po-1' }] },
      { id: 'receipts', label: 'Receipts', columns: [], rows: [{ key: 'rcp-1' }] },
    ]);
    fixture.componentRef.setInput('detailedTabId', 'orders');
    fixture.componentRef.setInput('rowKey', (row: Record<string, unknown>) => String(row['key']));
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      selectTab: (id: string) => void;
      onRowClick: (row: Record<string, unknown>) => void;
      selectedKey: () => string | null;
    };

    instance.selectTab('receipts');

    expect(() => instance.onRowClick({ key: 'rcp-1' })).not.toThrow();
    expect(instance.selectedKey()).toBeNull();
  });

  it('renders and wires an optional detail-panel action button', () => {
    const fixture = TestBed.createComponent(OfficeScreen);
    fixture.componentRef.setInput('title', 'Outbound');
    fixture.componentRef.setInput('detailedTabId', 'main');
    fixture.componentRef.setInput('rowKey', (row: Record<string, unknown>) => String(row['id']));

    let actionCalls = 0;
    fixture.componentRef.setInput('detail', () => ({
      eyebrow: 'Detail',
      title: 'Row title',
      code: 'ROW-1',
      status: 'inbound' as const,
      statusLabel: 'Open',
      fields: [],
      action: { label: 'Allocate', onClick: () => actionCalls++ },
    }));
    fixture.componentRef.setInput('tabs', [
      { id: 'main', label: 'Main', columns: [{ key: 'id', label: 'ID' }], rows: [{ id: 'ROW-1' }] },
    ]);
    fixture.detectChanges();

    fixture.componentInstance.onRowClick({ id: 'ROW-1' });
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('aside button'));
    const actionButton = buttons.find((b) => b.textContent?.trim() === 'Allocate') as HTMLButtonElement | undefined;
    expect(actionButton).toBeTruthy();

    actionButton!.click();
    expect(actionCalls).toBe(1);
  });

  it('renders tab and default status-filter chip buttons with a visible focus-visible ring', () => {
    const fixture = TestBed.createComponent(OfficeScreen);
    fixture.componentRef.setInput('title', 'Inventory');
    fixture.componentRef.setInput('detailedTabId', 'stock');
    fixture.componentRef.setInput('rowKey', (row: Record<string, unknown>) => String(row['id']));
    fixture.componentRef.setInput('tabs', [
      { id: 'stock', label: 'Stock', columns: [], rows: [] },
      { id: 'reservations', label: 'Reservations', columns: [], rows: [] },
    ]);
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const tabButton = buttons.find((b) => b.textContent?.trim() === 'Stock') as HTMLButtonElement;
    // 'In Stock' (not 'All') is used here because the status filter defaults to 'all',
    // which makes the 'All' chip active by default — this asserts the non-active chip state.
    const chipButton = buttons.find((b) => b.textContent?.trim() === 'In Stock') as HTMLButtonElement;

    expect(tabButton.className).toContain('focus-visible:outline-2');
    expect(tabButton.className).toContain('focus-visible:outline-focus-ring');
    expect(chipButton.className).toContain('focus-visible:outline-2');
    expect(chipButton.className).toContain('focus-visible:outline-focus-ring');
  });

  it('renders the active status-filter chip with a light focus-visible ring against its navy background', () => {
    const fixture = TestBed.createComponent(OfficeScreen);
    fixture.componentRef.setInput('title', 'Inventory');
    fixture.componentRef.setInput('detailedTabId', 'stock');
    fixture.componentRef.setInput('rowKey', (row: Record<string, unknown>) => String(row['id']));
    fixture.componentRef.setInput('tabs', [{ id: 'stock', label: 'Stock', columns: [], rows: [] }]);
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const chipButton = buttons.find((b) => b.textContent?.trim() === 'In Stock') as HTMLButtonElement;
    chipButton.click();
    fixture.detectChanges();

    expect(chipButton.className).toContain('focus-visible:outline-2');
    expect(chipButton.className).toContain('focus-visible:outline-on-primary');
  });

  it('opens and closes OfficeLayoutState.detailPanelOpen as the detail panel is shown and hidden', () => {
    const fixture = TestBed.createComponent(OfficeScreen);
    fixture.componentRef.setInput('title', 'Inventory');
    fixture.componentRef.setInput('detailedTabId', 'stock');
    fixture.componentRef.setInput('rowKey', (row: Record<string, unknown>) => String(row['id']));
    fixture.componentRef.setInput('detail', () => ({
      eyebrow: 'Detail',
      title: 'Row title',
      code: 'ROW-1',
      status: 'in-stock' as const,
      statusLabel: 'In stock',
      fields: [],
    }));
    fixture.componentRef.setInput('tabs', [
      { id: 'stock', label: 'Stock', columns: [{ key: 'id', label: 'ID' }], rows: [{ id: 'ROW-1' }] },
    ]);
    fixture.detectChanges();

    const layoutState = TestBed.inject(OfficeLayoutState);
    expect(layoutState.detailPanelOpen()).toBe(false);

    fixture.componentInstance.onRowClick({ id: 'ROW-1' });
    fixture.detectChanges();
    expect(layoutState.detailPanelOpen()).toBe(true);

    const closeButton = (fixture.nativeElement as HTMLElement).querySelector('aside button') as HTMLButtonElement;
    closeButton.click();
    fixture.detectChanges();
    expect(layoutState.detailPanelOpen()).toBe(false);
  });

  it('resets OfficeLayoutState.detailPanelOpen to false when the component is destroyed with a panel open', () => {
    const fixture = TestBed.createComponent(OfficeScreen);
    fixture.componentRef.setInput('title', 'Inventory');
    fixture.componentRef.setInput('detailedTabId', 'stock');
    fixture.componentRef.setInput('rowKey', (row: Record<string, unknown>) => String(row['id']));
    fixture.componentRef.setInput('detail', () => ({
      eyebrow: 'Detail',
      title: 'Row title',
      code: 'ROW-1',
      status: 'in-stock' as const,
      statusLabel: 'In stock',
      fields: [],
    }));
    fixture.componentRef.setInput('tabs', [
      { id: 'stock', label: 'Stock', columns: [{ key: 'id', label: 'ID' }], rows: [{ id: 'ROW-1' }] },
    ]);
    fixture.detectChanges();
    fixture.componentInstance.onRowClick({ id: 'ROW-1' });
    fixture.detectChanges();

    const layoutState = TestBed.inject(OfficeLayoutState);
    expect(layoutState.detailPanelOpen()).toBe(true);

    fixture.destroy();
    expect(layoutState.detailPanelOpen()).toBe(false);
  });
});
