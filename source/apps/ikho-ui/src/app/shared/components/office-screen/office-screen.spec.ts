import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OfficeScreen } from './office-screen';

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
});
