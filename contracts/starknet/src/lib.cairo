#[starknet::contract]
mod FundFlow {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::Map;

    #[derive(Drop, Copy, Serde, starknet::Store)]
    pub struct Circle {
        pub creator: ContractAddress,
        pub funding_goal: u128,
        pub total_collected: u128,
        pub recurring_amount: u128,
        pub risk_level: u8,
        pub total_duration_days: u32,
        pub member_count: u32,
        pub is_public: bool,
        pub exists: bool,
    }

    #[storage]
    struct Storage {
        circles: Map<felt252, Circle>,
        membership: Map<(felt252, ContractAddress), bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        CircleCreated: CircleCreated,
        MemberJoined: MemberJoined,
        ContributionAdded: ContributionAdded,
    }

    #[derive(Drop, starknet::Event)]
    struct CircleCreated {
        code: felt252,
        creator: ContractAddress,
        funding_goal: u128,
        recurring_amount: u128,
        is_public: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct MemberJoined {
        code: felt252,
        member: ContractAddress,
        member_count: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct ContributionAdded {
        code: felt252,
        member: ContractAddress,
        amount: u128,
        total_collected: u128,
    }

    #[external(v0)]
    fn create_circle(
        ref self: ContractState,
        code: felt252,
        funding_goal: u128,
        recurring_amount: u128,
        risk_level: u8,
        total_duration_days: u32,
        is_public: bool,
    ) {
        let caller = get_caller_address();
        let existing = self.circles.read(code);
        assert(!existing.exists, 'CODE_EXISTS');

        let circle = Circle {
            creator: caller,
            funding_goal,
            total_collected: 0,
            recurring_amount,
            risk_level,
            total_duration_days,
            member_count: 1,
            is_public,
            exists: true,
        };

        self.circles.write(code, circle);
        self.membership.write((code, caller), true);

        self.emit(CircleCreated {
            code,
            creator: caller,
            funding_goal,
            recurring_amount,
            is_public,
        });
    }

    #[external(v0)]
    fn join_circle(ref self: ContractState, code: felt252) {
        let caller = get_caller_address();
        let mut circle = self.circles.read(code);
        assert(circle.exists, 'CIRCLE_NOT_FOUND');

        let already_member = self.membership.read((code, caller));
        assert(!already_member, 'ALREADY_MEMBER');

        self.membership.write((code, caller), true);
        circle.member_count = circle.member_count + 1;
        self.circles.write(code, circle);

        self.emit(MemberJoined { code, member: caller, member_count: circle.member_count });
    }

    #[external(v0)]
    fn contribute(ref self: ContractState, code: felt252, amount: u128) {
        let caller = get_caller_address();
        let mut circle = self.circles.read(code);
        assert(circle.exists, 'CIRCLE_NOT_FOUND');

        let is_member = self.membership.read((code, caller));
        assert(is_member, 'NOT_MEMBER');

        circle.total_collected = circle.total_collected + amount;
        self.circles.write(code, circle);

        self.emit(ContributionAdded {
            code,
            member: caller,
            amount,
            total_collected: circle.total_collected,
        });
    }

    #[external(v0)]
    fn get_circle(self: @ContractState, code: felt252) -> Circle {
        self.circles.read(code)
    }

    #[external(v0)]
    fn is_member(self: @ContractState, code: felt252, member: ContractAddress) -> bool {
        self.membership.read((code, member))
    }
}
