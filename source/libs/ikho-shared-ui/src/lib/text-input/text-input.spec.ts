import { TestBed } from '@angular/core/testing';
import { TextInput } from './text-input';

describe('TextInput', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextInput],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(TextInput);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should update the value model when the input changes', () => {
    const fixture = TestBed.createComponent(TextInput);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = 'SKU-123';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('SKU-123');
  });
});
