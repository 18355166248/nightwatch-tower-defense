export class EconomyLedger {
    private currentBalance: number;

    public constructor(initialBalance: number) {
        this.assertAmount(initialBalance, 'initialBalance');
        this.currentBalance = initialBalance;
    }

    public get balance(): number {
        return this.currentBalance;
    }

    public canSpend(amount: number): boolean {
        this.assertAmount(amount, 'amount');
        return this.currentBalance >= amount;
    }

    public trySpend(amount: number): boolean {
        if (!this.canSpend(amount)) return false;
        this.currentBalance -= amount;
        return true;
    }

    public credit(amount: number): void {
        this.assertAmount(amount, 'amount');
        this.currentBalance += amount;
    }

    private assertAmount(amount: number, name: string): void {
        if (!Number.isInteger(amount) || amount < 0) throw new RangeError(`${name} 必须为非负整数`);
    }
}
